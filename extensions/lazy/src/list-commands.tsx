import { ActionPanel, environment, getPreferenceValues, Icon, List, PushAction } from "@raycast/api";
import { execaSync } from "execa";
import Frecency from "frecency";
import Fuse from "fuse.js";
import { LocalStorage } from "node-localstorage";
import { homedir } from "os";
import { resolve } from "path/posix";
import { useEffect, useState } from "react";
import { Action, Preview, Step } from "./components";
import { Lazy } from "./lazy";

const { "lazy-path": PATH } = getPreferenceValues();
process.env.PATH = PATH.replace("~", homedir());

const commandFrecency = new Frecency({
  key: "commands.json",
  idAttribute: "title",
  storageProvider: new LocalStorage(resolve(environment.supportPath, "frecency")),
});

export default function listCommands(): JSX.Element {
  const [roots, setRoots] = useState<Lazy.Cache[]>();
  const [query, setQuery] = useState<string>();

  const updateItems = () => {
    const { stdout } = execaSync("lazy", ["ls"]);
    const lines = stdout.split("\n");
    const roots = lines.map((line) => JSON.parse(line));
    setRoots(roots);
  }

  useEffect(updateItems, []);

  const fuse = new Fuse(roots || [], { keys: ["title", "subtitle"], ignoreLocation: true, threshold: 0.2 });
  const results = query ? fuse.search(query).map((res) => res.item) : roots;

  const items: Lazy.Cache[] = commandFrecency.sort({
    searchQuery: query,
    results: results || [],
  });

  return (
    <List isLoading={typeof roots == "undefined"} onSearchTextChange={setQuery}>
      {items?.map((root, index) => (
        <List.Item
          key={index}
          title={root.title}
          subtitle={root.subtitle}
          keywords={root.subtitle ? [root.subtitle] : undefined}
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
                    updateItems={updateItems}
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
