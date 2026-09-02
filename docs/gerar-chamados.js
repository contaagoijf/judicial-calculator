#!/usr/bin/env node
"use strict";

/**
 * Le commits de um repo git e monta a base mecanica dos chamados (commit, data, linhas
 * adicionadas exatas, mensagem). Nao escreve Titulo/Solicitacao/Solucao — isso fica para
 * quem revisa (Claude ou o usuario), seguindo o padrao em skill-chamados-trabalho.md.
 *
 * Uso:
 *   node gerar-chamados.js --repo <caminho> [--range <a..b>] [--branch <nome>]
 *                           [--since <data>] [--until <data>] [--start-id <n>] [--tipo <Tipo>]
 *                           [--url-projeto <url-do-projeto-no-gitlab>]
 *                           [--push <url-do-servidor> --token <token> --tarefa-id <id>]
 *
 * Exemplos:
 *   node gerar-chamados.js --repo ../meu-projeto --since 2026-08-10
 *   node gerar-chamados.js --repo ../meu-projeto --range 47cf2f5..HEAD --start-id 26
 *
 *   # com link para o commit no GitLab (a base muda por setor/projeto):
 *   node gerar-chamados.js --repo ../meu-projeto --range a..b \
 *     --url-projeto https://git.trf2.jus.br/cosadm-projetos-financeiros/SAD-2.0
 *
 *   # envia direto pro chamados-sistema em vez de so imprimir (token vem de /admin/usuarios):
 *   node gerar-chamados.js --repo ../meu-projeto --since 2026-08-10 \
 *     --push http://localhost:4000 --token <api_token> --tarefa-id 3
 *
 * Este script cobre so os fluxos 1 e 2 (JSON e importacao no SGC) da skill em
 * skill-chamados-trabalho.md. O fluxo 3 (abrir o chamado de verdade no GLPI real e marcar
 * `registrado` no SGC) e feito depois, por automacao de navegador — ver a secao "Mecanica
 * real confirmada por automacao de navegador (Fase 2)" nesse mesmo arquivo antes de tentar,
 * e so rodar esse fluxo 3 mediante pedido explicito do usuario.
 */

const { execFileSync } = require("child_process");

function parseArgs(argv) {
  const args = { repo: ".", startId: 1, tipo: "Desenvolvimento" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--repo") args.repo = argv[++i];
    else if (a === "--range") args.range = argv[++i];
    else if (a === "--branch") args.branch = argv[++i];
    else if (a === "--since") args.since = argv[++i];
    else if (a === "--until") args.until = argv[++i];
    else if (a === "--start-id") args.startId = parseInt(argv[++i], 10);
    else if (a === "--tipo") args.tipo = argv[++i];
    else if (a === "--push") args.push = argv[++i];
    else if (a === "--token") args.token = argv[++i];
    else if (a === "--tarefa-id") args.tarefaId = argv[++i];
    else if (a === "--url-projeto") args.urlProjeto = argv[++i];
    else throw new Error("Argumento desconhecido: " + a);
  }
  return args;
}

function git(repo, args) {
  return execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", maxBuffer: 1024 * 1024 * 64 });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.push && (!args.token || !args.tarefaId)) {
    throw new Error("--push exige tambem --token <api_token> e --tarefa-id <id>.");
  }

  const logArgs = ["log", "--no-merges", "--reverse", "--pretty=format:%H%x1f%ad%x1f%s", "--date=short"];
  if (args.range) logArgs.push(args.range);
  if (args.branch) logArgs.push(args.branch);
  if (args.since) logArgs.push("--since=" + args.since);
  if (args.until) logArgs.push("--until=" + args.until);

  const logOut = git(args.repo, logArgs).trim();
  if (!logOut) {
    console.error("Nenhum commit encontrado com esses filtros.");
    process.exit(1);
  }

  const commits = logOut.split("\n").map((line) => {
    const [hash, date, subject] = line.split("\x1f");
    return { hash, date, subject };
  });

  // Base do projeto no GitLab. Fica como parametro porque muda por setor:
  // https://git.trf2.jus.br/<grupo>/<projeto>. Sem ela, o chamado sai sem link.
  const urlProjeto = args.urlProjeto ? args.urlProjeto.replace(/\/+$/, "") : null;

  const chamados = [];
  let totalInsercoes = 0;

  commits.forEach((c, idx) => {
    const numstat = git(args.repo, ["show", "--numstat", "--format=", c.hash]).trim();
    let insercoes = 0;
    if (numstat) {
      for (const line of numstat.split("\n")) {
        const [added] = line.split("\t");
        const n = parseInt(added, 10);
        if (!Number.isNaN(n)) insercoes += n;
      }
    }
    totalInsercoes += insercoes;

    chamados.push({
      id: args.startId + idx,
      tipo: args.tipo,
      commit: c.hash.slice(0, 7),
      commitCompleto: c.hash,
      data: c.date,
      mensagemCommit: c.subject,
      linhas: insercoes,
      // snake_case de proposito: e o nome que o chamados-sistema le para
      // transformar o hash em link na tela. `commitUrl` em camelCase e ignorado.
      commit_url: urlProjeto ? `${urlProjeto}/-/commit/${c.hash}` : null,
      titulo: null,
      solic: null,
      sol: null,
    });
  });

  const resultado = {
    repo: args.repo,
    repoUrl: urlProjeto,
    totalCommits: chamados.length,
    totalInsercoes,
    chamados,
  };

  console.log(JSON.stringify(resultado, null, 2));
  console.error(
    `\n${chamados.length} commit(s), ${totalInsercoes} linha(s) adicionada(s) no total. ` +
      "titulo/solic/sol ficam null — preencher seguindo skill-chamados-trabalho.md antes de colar no facilitador."
  );

  if (args.push) {
    const url = args.push.replace(/\/$/, "") + "/api/tarefas/" + args.tarefaId + "/importar";
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + args.token,
      },
      body: JSON.stringify(resultado),
    });
    const corpo = await resposta.json().catch(() => ({}));
    if (!resposta.ok) {
      console.error(`\nFalha ao enviar para ${url}: HTTP ${resposta.status} — ${corpo.erro || "erro desconhecido"}`);
      process.exit(1);
    }
    console.error(`\nEnviado para ${url}: ${corpo.importados} chamado(s) criado(s) como rascunho na tarefa ${args.tarefaId}.`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
