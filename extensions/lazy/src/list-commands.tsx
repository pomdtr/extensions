import { environment, getPreferenceValues, render } from "@raycast/api";
import { homedir } from "os";
import { resolve } from "path";
import { RootCommands } from "./components";
import { loadConfigs, parseConfigs, validateConfigs } from "./io";

const {"lazy-dir": configDir, "lazy-path": PATH} = getPreferenceValues()
const CONFIG_DIR = configDir.replace("~", homedir())

process.env.PATH = PATH

const SCHEMA_PATH = resolve(environment.assetsPath, "schema.json");
async function main() {
  const configs = await loadConfigs(CONFIG_DIR);
  validateConfigs(
    configs.map((config) => config.config),
    SCHEMA_PATH
  );
  const roots = parseConfigs(configs);
  return render(<RootCommands roots={roots} configDir={CONFIG_DIR}/>);
}

main();
