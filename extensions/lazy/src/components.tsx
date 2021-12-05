/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ActionPanel,
  closeMainWindow,
  copyTextToClipboard,
  CopyToClipboardAction,
  Detail,
  Icon,
  List,
  popToRoot,
  PushAction,
  showHUD,
  showToast,
  ToastStyle
} from "@raycast/api";
import { execa, execaSync } from "execa";
import { useEffect, useState } from "react";
import { Lazy } from "./lazy";

const codeblock = (text: string) => "```\n" + text + "\n```";
const escapeQuotes = (text: string) => {
  return text.replace("'", "'\"'\"'");
};

export function Preview(props: { command: Lazy.Command }) {
  const [content, setContent] = useState<string>();
  useEffect(() => {
    const input = JSON.stringify(props.command);
    try {
      const { stdout } = execaSync("lazy", ["run"], { input });
      setContent(stdout);
    } catch (e) {
      console.error(e);
      copyTextToClipboard(`echo '${escapeQuotes(input)}' | lazy run`);
      showToast(ToastStyle.Failure, "An error occured!", "Command copied to clipboard");
    }
  }, []);
  return (
    <Detail
      isLoading={typeof content == "undefined"}
      markdown={content ? codeblock(content) : undefined}
      actions={<ActionPanel>{content ? <CopyToClipboardAction content={content} /> : null}</ActionPanel>}
    />
  );
}

export function Step(props: { reference: Lazy.StepReference }) {
  const { reference } = props;
  const [state, setState] = useState<{ list?: Lazy.List; isLoading: boolean }>({ isLoading: true });
  const refreshItems = () => {
    const input = JSON.stringify(reference);
    setState({...state, isLoading: true });
    try {
      const { stdout } = execaSync("lazy", ["ref"], { input });
      const list: Lazy.List = JSON.parse(stdout);
      setState({ list, isLoading: false });
    } catch (e) {
      console.error(e);
      copyTextToClipboard(`echo '${escapeQuotes(input)}' | lazy ref`);
      showToast(ToastStyle.Failure, "An error occured!", "Command copied to clipboard");
    }
  };
  useEffect(refreshItems, []);

  if (state.list?.type == "query") return <QueryStep reference={reference} list={state.list} />;

  return (
    <List isLoading={state.isLoading}>
      {state.list?.items.map((item, index) => (
        <ListItem item={item} key={index} updateItems={refreshItems} />
      ))}
    </List>
  );
}

export function QueryStep(props: { reference: Lazy.StepReference; list: Lazy.List }) {
  const [query, setQuery] = useState<string>();
  const [state, setState] = useState<{ list: Lazy.List; isLoading: boolean }>({ list: props.list, isLoading: false });
  let shouldUpdate = true;

  const refreshItems = () => {
    setState({ ...state, isLoading: true });
    const input = JSON.stringify(props.reference);
    execa("lazy", query ? ["ref", query] : ["ref"], { input })
      .then(({ stdout }) => {
        const list: Lazy.List = JSON.parse(stdout);
        if (shouldUpdate) setState({ list, isLoading: false });
      })
      .catch(async (e) => {
        console.error(e);
        copyTextToClipboard(`echo '${escapeQuotes(input)}' | lazy ref '${query}'`);
        await showToast(ToastStyle.Failure, "An error occured!", "Command copied to clipboard");
      });
  };

  useEffect(() => {
    refreshItems();
    return () => {
      shouldUpdate = false;
    };
  }, [query]);

  return (
    <List onSearchTextChange={setQuery} throttle={true} isLoading={state.isLoading}>
      {state.list.items.map((item, index) => (
        <ListItem item={item} key={index} updateItems={refreshItems} />
      ))}
    </List>
  );
}

export function ListItem(props: { item: Lazy.Cache; updateItems: () => void }) {
  const item = props.item;
  return (
    <List.Item
      title={item.title}
      subtitle={item.subtitle}
      actions={
        <ActionPanel>
          {item.actions?.map((action, index) => {
            if (action.condition == "false") return null;
            if (action.type == "ref") {
              return (
                <PushAction
                  key={index}
                  title={action.title}
                  icon={Icon.ArrowRight}
                  target={<Step reference={action} />}
                />
              );
            }
            return <Action key={index} action={action} updateItems={props.updateItems} />;
          })}
          {item.preview ? (
            <PushAction
              title="Show Preview"
              icon={Icon.Text}
              target={<Preview command={item.preview as unknown as Lazy.Command} />}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

export function Action(props: { action: Lazy.RunAction; onAction?: () => void; updateItems: () => void }) {
  const { action, onAction, updateItems } = props;

  const displayRes = (content: string) => {
    if (action.updateItems) return showToast(ToastStyle.Success, content);
    return showHUD(content);
  };

  const runCommand = async () => {
    const input = JSON.stringify(props.action);
    try {
      const { stdout } = execaSync("lazy", ["run"], { input });
      if (stdout) displayRes(stdout);
      if (updateItems) updateItems();
      else {
        await closeMainWindow();
        await popToRoot();
      }
    } catch (e) {
      console.error(e);
      copyTextToClipboard(`echo '${escapeQuotes(input)}' | lazy run`);
      await showToast(ToastStyle.Failure, "An error occured!", "Command copied to clipboard");
    }
  };

  return (
    <ActionPanel.Item
      title={action.title || action.command}
      icon={Icon.Hammer}
      onAction={async () => {
        await runCommand();
        if (onAction) onAction();
      }}
    />
  );
}
