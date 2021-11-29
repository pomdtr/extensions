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
    roots?: StaticItem[];
  }

  export interface BaseStep {
    type: "query" | "filter" | "static" | "form" | "preview";
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

  export interface DynamicList extends BaseStep {
    items: DynamicItems;
  }

  export interface QueryList extends DynamicList {
    type: "query";
  }

  export interface FilterList extends DynamicList {
    type: "filter";
  }

  export interface StaticList extends BaseStep {
    type: "static"
    items: StaticItem[];
  }

  export interface Item {
    title?: string;
    subtitle?: string;
    preview?: string;
  }

  export interface DynamicItems extends Item {
    delimiter?: string;
    generator: string | Command;
    actions?: Action[];
  }

  export interface StaticItem extends Item {
    title: string;
    actions?: Action[];
  }

  export interface Preview extends BaseStep {
    type: "preview";
    shell?: string;
    content: string | Command;
    markdown?: boolean;
    actions?: Action[];
  }

  export type Step = StaticList | FilterList | QueryList | Preview | Form;

  export interface Command {
    command: string;
    skip_lines?: number;
    shell?: string;
  }

  interface BaseAction {
    condition?: string
    shortcut?: string;
  }

  export interface CommandAction extends Command, BaseAction {
    type: "command"
    title: string;
    reloadOnSuccess?: string;
    confirm?: boolean;
  }

  export interface StepAction extends BaseAction {
    type: "step"
    alias?: string;
    packageName?: string;
    target: string;
    params?: StepEnv;
  }

  export type Action = CommandAction | StepAction

  export interface Packages {
    [packageName: string]: {
      steps: { [stepId: string]: Step },
      prefs: StepEnv
    };
  }

  export interface StepEnv {
    [key: string]: unknown;
  }

  export interface Form extends BaseStep {
    fields: Field[];
    type: "form";

    action: Action;
  }

  export interface BaseField {
    type: "checkbox" | "dropdown" | "textfield" | "textarea";
    dest: string;
    title: string;
    default?: unknown;
  }

  export interface CheckBox extends BaseField {
    type: "checkbox";
    default?: boolean;
  }

  export interface DropDown extends BaseField {
    items: string[];
    type: "dropdown";
    default?: string;
  }

  export interface TextField extends BaseField {
    type: "textfield";
    default?: string;
  }

  export interface TextArea extends BaseField {
    type: "textarea";
    default?: string;
  }

  export type Field = CheckBox | DropDown | TextField | TextArea;

export interface Roots {
  [packageName: string]: {
    items: Lazy.StaticItem[];
    icon?: string;
    requirements?: string[];
  };
}
}
