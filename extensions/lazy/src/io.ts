import { readFile } from "fs/promises";
import { globby } from "globby";
import { validate } from "jsonschema";
import { resolve } from "path";
import which from "which";
import yaml from "yaml";
import { Lazy } from "./lazy";

export async function loadConfigs(configDir: string) {
  const globs = await globby(`**/**.yaml`, { cwd: configDir });
  const loadConfig = (path: string) => readFile(path, "utf-8").then((content) => yaml.parse(content) as Lazy.Config);
  const configs = await Promise.all(
    globs.map((glob) => loadConfig(resolve(configDir, glob)))
  );
  return configs;
}

export async function validateConfigs(configs: Lazy.Config[], schemaPath: string) {
  const schema = JSON.parse(await readFile(schemaPath, "utf-8"));
  for (const config of configs) {
    validate(config, schema);
  }
}

const packages: Lazy.Packages = {};
export function parseConfigs(configs: Lazy.Config[]) {
  const roots: Lazy.Roots = {};
  for (const config of configs) {
    const packageName = config.packageName
    packages[packageName] = {steps: {}, prefs: config.prefs || {}};
    for (const requirement of config.requirements || []) {
      which.sync(requirement);
    }

    for (const [step_id, step] of Object.entries(config.steps || {})) {
      packages[packageName].steps[step_id] = {
        ...config.steps[step_id],
        packageName: packageName,
        params: { ...config.prefs, ...step.params },
      };
    }

    if (config.roots)
      roots[packageName] = { items: config.roots, icon: config.icon, requirements: config.requirements };
  }

  return roots;
}

export function GetStep(reference: Lazy.StepAction | string, packageName: string) : Lazy.Step {
  const target = typeof reference == "string" ? reference : reference.target;
  const targetPackageName = typeof reference == "string" ? packageName : reference.packageName || packageName;
  const targetPackage = packages[targetPackageName];
  if (!targetPackage) {
    return {content: `Package \`${packageName}\` does not exist!`, type: "preview", title: "Unknown Step", markdown: true, packageName: "error", prefs: {}}
  }
  const step = targetPackage.steps[target];
  const prefs = targetPackage.prefs
  if (!step) {
    return {content: `Step \`${target}\` does not exist in package \`${packageName}\``, type: "preview", title: "Unknown Step", markdown: true, packageName: "error", prefs: {}}
  }

  return {...step, prefs};
}
