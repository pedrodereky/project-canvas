export type CommandContext = { editable: boolean; focusedArea: string | null };
export type Command = {
  id: string;
  name: string;
  shortcut?: string;
  needsEdit?: boolean;
  run: () => void;
};
export class CommandRegistry {
  private commands = new Map<string, Command>();
  register(command: Command) {
    this.commands.set(command.id, command);
    return () => this.commands.delete(command.id);
  }
  list(context: CommandContext) {
    return [...this.commands.values()].filter((c) => !c.needsEdit || context.editable);
  }
  search(query: string, context: CommandContext) {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return this.list(context).filter((c) => c.name.toLocaleLowerCase("pt-BR").includes(normalized));
  }
  execute(id: string, context: CommandContext) {
    const command = this.commands.get(id);
    if (!command || (command.needsEdit && !context.editable)) return false;
    command.run();
    return true;
  }
}
