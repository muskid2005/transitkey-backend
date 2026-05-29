export function codeGenerator() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let prefix = "";
  let suffix = "";

  for (let i = 0; i < 2; i++) {
    prefix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  for (let i = 0; i < 2; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const num = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");

  const fullCode = `${prefix}${num}${suffix}`;

  return fullCode;
}
