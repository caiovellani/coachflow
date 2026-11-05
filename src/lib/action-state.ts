export type ActionState = {
  status: "success" | "error";
  message: string;
} | null;

export const INVALID_DATA: ActionState = {
  status: "error",
  message: "Verifique os dados informados.",
};
