import { showToast, ToastStyle } from "@raycast/api";
import { execaCommand } from "execa";
import { readFileSync } from "fs";
import { readFile } from "fs/promises";
import { globby } from "globby";
import { validate } from "jsonschema";
import { homedir } from "os";
import { resolve } from "path";
import which from "which";
import yaml from "yaml";
import { Lazy } from "./lazy";
import { renderAction, renderString } from "./template";

export class LazyApi {
  packages: Record<string, Lazy.Package> = {};
  roots: Lazy.Root[] = [];
  schema: object;

  constructor(schemaPath: string) {
    this.schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  }

  async load(configDir: string) {
    const configs = await loadConfigs(configDir);

    for (const config of configs) {
      validate(config, this.schema);
    }

    this.packages = Object.fromEntries(configs.map((config) => [config.packageName, getPackage(config)]));
    this.roots = configs.map((config) => {
      const { packageName, roots, icon } = config;
      return { packageName, refs: roots, icon };
    });
  }

  listRoots() {
    return this.roots;
  }

  getStep(reference: Lazy.StepReference, currentPackageName: string): Lazy.Step {
    const { target, params: refParams, packageName = currentPackageName } = reference;

    const pkg = this.packages[packageName];
    if (!pkg) {
      throw Error(`Package \`${currentPackageName}\` does not exist!`);
    }
    const step = pkg.steps[target];
    const prefs = pkg.prefs;
    if (!step) {
      throw Error(`Step \`${target}\` does not exist in package \`${currentPackageName}\`!`);
    }

    return { ...step, prefs, params: { ...step.params, ...refParams } };
  }

  exec(command: string, shell = "/bin/bash") {
    console.debug(command);
    return execaCommand(command, { cwd: homedir(), shell }).catch((error) => {
      console.error(error.message);
      showToast(ToastStyle.Failure, "An error occurred!", error.message);
      throw error;
    });
  }

  lineToItem(line: string, itemTemplate: Lazy.ItemTemplate, templateParams: Record<string, unknown>) {
    const json = parseJson(line);
    const words = line.split(itemTemplate.delimiter || /\s+/);
    const lineParams = { line, json, words, ...templateParams };
    return {
      title: itemTemplate.title ? renderString(itemTemplate.title, lineParams) : line,
      icon: itemTemplate.icon ? renderString(itemTemplate.icon, lineParams) : undefined,
      preview: itemTemplate.preview ? renderString(itemTemplate.preview, lineParams) : undefined,
      actions: itemTemplate.actions?.map((action) => renderAction(action, lineParams)),
    } as Lazy.Item;
  }

  async getItems(step: Lazy.Step, templateParams: Record<string, unknown>): Promise<Lazy.Item[]> {
    const itemTemplate = step.items;
    const generator =
      typeof itemTemplate.generator == "string" ? { command: itemTemplate.generator } : itemTemplate.generator;

    const { stdout } = await this.exec(renderString(generator.command, templateParams), generator.shell).catch(() => {
      throw new Error(generator.errorMessage);
    })
    const lines = stdout.split("\n");

    return lines.map((line) => {
      return this.lineToItem(line, itemTemplate, templateParams);
    });
  }
}

export async function loadConfigs(configDir: string) {
  const globs = await globby(`**/**.yaml`, { cwd: configDir });
  const loadConfig = (path: string) => readFile(path, "utf-8").then((content) => yaml.parse(content) as Lazy.Config);
  const configs = await Promise.all(globs.map((glob) => loadConfig(resolve(configDir, glob))));
  return configs;
}

export function getPackage(config: Lazy.Config) {
  const pkg: Lazy.Package = { steps: {}, prefs: config.prefs || {} };
  for (const requirement of config.requirements || []) {
    which.sync(requirement);
  }

  pkg.prefs = config.prefs || {};
  for (const [step_id, step] of Object.entries(config.steps || {})) {
    pkg.steps[step_id] = {
      ...config.steps[step_id],
      packageName: config.packageName,
      params: { ...step.params },
    };
  }

  return pkg;
}

function parseJson(line: string) {
  try {
    return JSON.parse(line);
  } catch (e) {
    return null;
  }
}
