import { describe, expect, it } from "vitest";

import {
  isGrounded,
  matchExercises,
  statesCompletion,
} from "@/lib/agent/guards";

const exercises = [
  { name: "Supino reto" },
  { name: "Supino inclinado" },
  { name: "Agachamento" },
  { name: "Remada curvada" },
];

const names = (query: string) =>
  matchExercises(query, exercises).map(({ name }) => name);

describe("matchExercises", () => {
  it("ignora caixa e acento", () => {
    expect(names("SUPINO RETO")).toEqual(["Supino reto"]);
    expect(matchExercises("agachamento", [{ name: "Agachaménto" }])).toHaveLength(1);
  });

  it("devolve as opcoes quando ha ambiguidade", () => {
    expect(names("supino")).toEqual(["Supino reto", "Supino inclinado"]);
  });

  it("nao inventa correspondencia", () => {
    expect(names("leg press")).toEqual([]);
    expect(names("   ")).toEqual([]);
  });
});

describe("isGrounded", () => {
  it("aceita numeros ditos pelo aluno", () => {
    expect(isGrounded([10, 10, 8, 60], ["Fiz supino com 60 kg: 10, 10 e 8"])).toBe(true);
  });

  it("aceita carga com virgula", () => {
    expect(isGrounded([12.5], ["usei 12,5 kg"])).toBe(true);
  });

  it("aceita numeros de mensagens anteriores da conversa", () => {
    expect(isGrounded([10, 8], ["fiz 10 e 8", "foi no supino"])).toBe(true);
  });

  it("recusa carga inventada", () => {
    expect(isGrounded([10, 60], ["fiz 10 repetições"])).toBe(false);
  });
});

describe("statesCompletion", () => {
  it.each(["Terminei o treino", "acabei!", "concluí", "pode fechar", "sim"])(
    "aceita: %s",
    (text) => expect(statesCompletion(text)).toBe(true),
  );

  it.each(["qual é meu treino?", "vou começar agora", "fiz supino", "quantas séries faltam?"])(
    "recusa: %s",
    (text) => expect(statesCompletion(text)).toBe(false),
  );
});
