/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ActionPanel, Detail, Icon, KeyEquivalent, List, PushAction, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { LazyApi } from "./api";
import { Lazy } from "./lazy";

const codeblock = (text: string) => "```\n" + text + "\n```";

export function Step(props: { step: Lazy.Step; laziApi: LazyApi }) {
  const { step, laziApi } = props;
  const [query, setQuery] = useState<string>("");
  const [state, setState] = useState<{ items: Lazy.Item[]; isLoading: boolean }>({ items: [], isLoading: true });
  let shouldUpdate = true;

  const refreshItems = () => {
    if (step.type == "query" && !query){
      setState({items: [], isLoading: false});
      return
    }

    const { params, prefs } = step;
    const templateParam = step.type == "query" ? { params, prefs, query } : { params, prefs };
    laziApi.getItems(step, templateParam).then((items) => {
      if (shouldUpdate) setState({ items, isLoading: false });
    });
  };

  useEffect(() => {
    refreshItems();
    return () => {
      shouldUpdate = false;
    };
  }, [query]);

  return (
    <List
      navigationTitle={step.title}
      isLoading={state.isLoading}
      onSearchTextChange={step.type == "query" ? setQuery : undefined}
    >
      {state.items.map((item, index) => (
        <List.Item
          key={index}
          title={item.title}
          subtitle={item.subtitle}
          icon={Icon.Dot}
          keywords={item.subtitle?.split(" ")}
          actions={
            <ActionPanel>
              {item.actions?.map((action, index) => {
                if (action.condition == "false") return null;
                if (action.type == "ref") {
                  const next = laziApi.getStep(action, step.packageName);
                  return (
                    <PushAction
                      key={index}
                      title={action.alias || step.title}
                      icon={Icon.ArrowRight}
                      target={<Step step={next} laziApi={laziApi} />}
                    />
                  );
                }
                return (
                  <CommandAction
                    key={index}
                    action={action}
                    onAction={() => laziApi.exec(action.command, action.shell)}
                    refresh={refreshItems}
                  />
                );
              })}
              {item.preview ? (
                <PushAction
                  title="Show Preview"
                  icon={Icon.Text}
                  target={<Detail markdown={codeblock(item.preview)} />}
                />
              ) : null}
              <ActionPanel.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={refreshItems} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function CommandAction(props: { action: Lazy.CommandAction; onAction: () => void; refresh?: () => void }) {
  const { action, onAction } = props;
  if (action.confirm)
    return (
      <PushAction
        title={action.title || action.command}
        icon={Icon.Hammer}
        shortcut={action.shortcut ? { modifiers: ["ctrl"], key: action.shortcut as KeyEquivalent } : undefined}
        target={
          <ConfirmAction
            markdown={`> ⚠️ You're about to run the command **${action.command}**.  \n> Confirm?`}
            onConfirm={onAction}
          />
        }
      />
    );
  return (
    <ActionPanel.Item
      title={action.title || action.command}
      icon={Icon.Hammer}
      shortcut={action.shortcut ? { modifiers: ["ctrl"], key: action.shortcut as KeyEquivalent } : undefined}
      onAction={onAction}
    />
  );
}

export function ConfirmAction(props: { onConfirm: () => void; markdown: string }) {
  const navigation = useNavigation();
  return (
    <Detail
      markdown={props.markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="No" onAction={() => navigation.pop()} />
          <ActionPanel.Item
            title="Yes"
            onAction={() => {
              props.onConfirm();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
