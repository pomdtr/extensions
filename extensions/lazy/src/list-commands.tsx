import { ActionPanel, environment, getPreferenceValues, Icon, List, PushAction } from "@raycast/api";
import { homedir } from "os";
import { resolve } from "path";
import { useEffect, useRef, useState } from "react";
import { LazyApi } from "./api";
import { Step } from "./components";
import { Lazy } from "./lazy";

const { "lazy-dir": configDir, "lazy-path": PATH } = getPreferenceValues();
const CONFIG_DIR = configDir.replace("~", homedir());

process.env.PATH = PATH;

const SCHEMA_PATH = resolve(environment.assetsPath, "schema.json");

export default function listCommands(): JSX.Element {
  const lazyApi = useRef(new LazyApi(SCHEMA_PATH)).current;
  const [roots, setRoots] = useState<Lazy.Root[]>();

  useEffect(() => {
    lazyApi.load(CONFIG_DIR).then(() => {
      setRoots(lazyApi.listRoots());
    });
  }, []);

  return (
    <List isLoading={typeof roots == "undefined"}>
      {roots?.map(({ packageName, refs, icon }) =>
        refs.map((stepReference, index) => {
          const step = lazyApi.getStep(stepReference, packageName);
          return (
            <List.Item
              key={index}
              title={stepReference.alias || step.title}
              icon={icon}
              keywords={[packageName]}
              actions={
                <ActionPanel>
                  <PushAction
                    title={stepReference.alias || step.title}
                    icon={Icon.ArrowRight}
                    target={<Step step={step} laziApi={lazyApi} />}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
