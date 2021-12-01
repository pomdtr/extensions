/* eslint-disable @typescript-eslint/no-namespace */
export namespace Lazy {
  export interface Config {
    requirements?: string[];
    packageName: string;
    icon?: string;
    prefs?: StepEnv;
    steps: {
      [step_id: string]: Step;
    };
    roots: StepAction[];
  }

  export interface List {
    title: string;
    /**
     * @ignore
     */
    packageName: string;
    /**
     * @ignore
     */
    prefs: StepEnv;
    params?: StepEnv;
  }

  export interface DynamicList extends List {
    type: "filter" | "query";
    items: ItemTemplate;
  }

  export interface QueryList extends DynamicList {
    type: "query";
  }

  export interface FilterList extends DynamicList {
    type: "filter";
  }

  export interface Item {
    title: string;
    icon?: string;
    subtitle?: string;
    preview?: string;
    actions?: Action[];
  }

  export interface ItemTemplate {
    title?: string;
    icon?: string;
    subtitle?: string;
    preview?: string;
    delimiter?: string;
    generator: string | Command;
    actions?: Action[];
  }

  export type Step = FilterList | QueryList;

  export interface Command {
    command: string;
    skip_lines?: number;
    shell?: string;
  }

  interface BaseAction {
    condition?: string;
    shortcut?: string;
  }

  export interface CommandAction extends Command, BaseAction {
    type: "run";
    title: string;
    updateItems?: boolean;
    confirm?: boolean;
  }

  export interface StepReference {
    alias?: string;
    packageName?: string;
    target: string;
    params?: StepEnv;
  }

  export interface StepAction extends BaseAction, StepReference {
    type: "ref";
  }

  export type Action = CommandAction | StepAction;

  export interface Package {
    steps: { [stepId: string]: Step };
    prefs: StepEnv;
  }

  export interface Root {
    icon?: string,
    refs: StepReference[],
    packageName: string,
  }

  export interface StepEnv {
    [key: string]: unknown;
  }
}
