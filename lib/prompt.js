import readline from 'node:readline';

// One reader for the whole process, so piped input (several lines at once) is
// not swallowed by the first prompt. Paused between prompts so the process can exit.
let rl;
let lines;
let muted = false;

function reader() {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    lines = rl[Symbol.asyncIterator]();
    const write = rl._writeToOutput;
    rl._writeToOutput = (chunk) => {
      if (!muted) write.call(rl, chunk);
    };
  }
  return lines;
}

async function read(question, hidden) {
  const it = reader();
  rl.resume();
  rl.setPrompt(question);
  rl.prompt();
  muted = hidden;
  const { value, done } = await it.next();
  muted = false;
  rl.pause();
  if (hidden && process.stdin.isTTY) process.stdout.write('\n');
  return done ? '' : value.trim();
}

export const ask = (question) => read(question, false);

// Like ask, but does not echo what is typed. Use for secrets and mnemonics.
export const askHidden = (question) => read(question, true);
