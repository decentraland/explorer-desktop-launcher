import { main } from "./main"

export const parseConfig = (argv: string[]) => {
  argv.shift() // Skip process name
  while (argv.length != 0) {
    switch (argv[0]) {
      case '--developer-mode':
        main.config.developerMode = true
        break
      case '--custom-url':
        argv.shift()
        main.config.customUrl = process.argv[0]
        break
      case '--desktop-branch':
        argv.shift()
        main.config.desktopBranch = process.argv[0]
        break
    }
    argv.shift()
  }
}