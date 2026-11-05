// Regras deterministicas: valem mesmo que o modelo ignore o prompt.

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

/** Nome exato vence; senao, exercicios que contem todas as palavras informadas. */
export function matchExercises<T extends { name: string }>(
  query: string,
  exercises: T[],
): T[] {
  const target = normalize(query);
  const exact = exercises.filter(({ name }) => normalize(name) === target);
  if (exact.length > 0) return exact;

  const words = target.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return exercises.filter(({ name }) => {
    const candidate = normalize(name);
    return words.every((word) => candidate.includes(word));
  });
}

function numbersIn(text: string): Set<number> {
  const matches = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return new Set(matches.map((value) => Number(value.replace(",", "."))));
}

/** Todo numero que sera gravado precisa ter sido dito pelo aluno. */
export function isGrounded(values: number[], studentTexts: string[]): boolean {
  const said = numbersIn(studentTexts.join(" "));
  return values.every((value) => said.has(value));
}

const COMPLETION =
  /\b(terminei|terminou|acabei|acabou|conclui|concluido|finalizei|finalizado|encerrei|fechei|completei|pode fechar|pode encerrar|pode finalizar|sim|confirmo|isso)\b/;

/** A sessao so fecha se a propria mensagem do aluno disser isso. */
export function statesCompletion(text: string): boolean {
  return COMPLETION.test(normalize(text));
}
