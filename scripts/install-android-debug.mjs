import { existsSync } from "node:fs";
import { join, delimiter } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const androidDir = join(root, "android");
const isWindows = process.platform === "win32";
const wrapper = join(androidDir, isWindows ? "gradlew.bat" : "gradlew");

if (!existsSync(wrapper)) {
  console.error("Android Gradle wrapper is missing. Re-run the Velvet installer so it can preserve/restore gradlew files.");
  process.exit(1);
}

const env = { ...process.env };
if (isWindows) {
  const candidates = [
    env.JAVA_HOME,
    String.raw`C:\Program Files\Android\Android Studio\jbr`,
    String.raw`C:\Program Files\Android\Android Studio\jre`,
  ].filter(Boolean);
  const javaHome = candidates.find((candidate) => existsSync(join(candidate, "bin", "java.exe")));
  if (!javaHome) {
    console.error("Java was not found. Android Studio's bundled JBR is expected under C:\\Program Files\\Android\\Android Studio\\jbr.");
    process.exit(1);
  }
  env.JAVA_HOME = javaHome;
  env.PATH = `${join(javaHome, "bin")}${delimiter}${env.PATH ?? ""}`;
  console.log(`Using Android Studio Java: ${javaHome}`);
}

const result = isWindows
  ? spawnSync("cmd.exe", ["/d", "/s", "/c", `"${wrapper}" installDebug`], { cwd: androidDir, env, stdio: "inherit" })
  : spawnSync(wrapper, ["installDebug"], { cwd: androidDir, env, stdio: "inherit" });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
