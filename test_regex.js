const str = `> <:rp:1329188049283121172> **RP:** \`0\``;
const r = str.replace(/> <:rp:\d+> \*\*RP:\*\* `\d+`/, '> new');
console.log(r === str ? 'FAILED' : 'MATCHED');
