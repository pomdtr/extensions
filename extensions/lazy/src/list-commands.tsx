import { ActionPanel, environment, getPreferenceValues, Icon, List, PushAction } from "@raycast/api";
import { execaSync } from "execa";
import Frecency from "frecency";
import { readFileSync, writeFileSync } from "fs";
import Fuse from "fuse.js";
import { homedir } from "os";
import { useEffect, useMemo, useState } from "react";
import { Action, Preview, Step } from "./components";
import { Lazy } from "./lazy";

const { "lazy-path": PATH } = getPreferenceValues();
process.env.PATH = PATH.replace("~", homedir());

// SupportStorage implements the minimal API required by frecency
class SupportStorage {
  getItem(key: string): string | undefined {
    try {
      const value = readFileSync(environment.supportPath + "/" + key).toString();
      return value;
    } catch {
      return undefined;
    }
  }
  setItem(key: string, value: string): void {
    writeFileSync(environment.supportPath + "/" + key, value);
  }
}

const commandFrecency = new Frecency({
  key: "commands.json", // "key" becomes "filename"
  idAttribute: "title",
  storageProvider: new SupportStorage(),
});

export default function listCommands(): JSX.Element {
  const [roots, setRoots] = useState<Lazy.Item[]>([]);
  const [query, setQuery] = useState<string>();

  useEffect(() => {
    const { stdout } = execaSync("lazy", ["ls"]);
    const lines = stdout.split("\n");
    const roots = lines.map((line) => JSON.parse(line));
    setRoots(roots);
  }, []);

  const fuse = useMemo(() => new Fuse(roots || [], {keys: ["title", "subtitle"]}), [roots])


  const items: Lazy.Item[] = commandFrecency.sort({
    searchQuery: query,
    results: query ? fuse.search(query).map(res => res.item): roots
  });

  return (
    <List isLoading={typeof roots == "undefined"} onSearchTextChange={setQuery}>
      {items?.map((root, index) => (
        <List.Item
          key={index}
          title={root.title}
          subtitle={root.subtitle}
          keywords={root.subtitle ? [root.subtitle] : undefined}
          icon={root.icon}
          actions={
            <ActionPanel>
              {root.actions?.map((action, index) =>
                action.type == "ref" ? (
                  <PushAction
                    key={index}
                    title={action.title}
                    icon={Icon.ArrowRight}
                    target={<Step reference={action} />}
                    onPush={() => commandFrecency.save({ searchQuery: query || "", selectedId: root.title })}
                  />
                ) : (
                  <Action
                    key={index}
                    action={action}
                    onAction={() => commandFrecency.save({ searchQuery: query || "", selectedId: root.title })}
                  />
                )
              )}
              {root.preview ? (
                <PushAction
                  title="Show Preview"
                  icon={Icon.Text}
                  target={<Preview command={root.preview as unknown as Lazy.Command} />}
                />
              ) : null}
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
