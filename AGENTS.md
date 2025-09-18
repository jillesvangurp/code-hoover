## Build

- First compile kotlin js: `./gradlew -Pkotlin.js.yarn.ignore.yarn.lock=true jsBrowserDevelopmentWebpack `
- Then build and minimize with vite after the gradle build: `npm install && npm run build`

## Dependencies

- we use the refreshVersions plugin with gradle for kotlin and npm runtime dependencies
- gradle uses yarn under the hood but there's no need to run that directly
- after changing runtime dependencies, run './gradlew kotlinUpgradeYarnLock' to update the lock file
- the exception here is vite which we run via npm: `npm run build`. However, aside from development dependencies for vite,tailwind,etc., all runtime dependencies are managed via gradle

## Styling

- tailwind 4.x with daisyui as the component framework
- prefer daisyui components over custom tailwind styling; that's why it's there. Styling should be mostly minimal.
- we have light mode and darkmode and changes need to stick with the black and white themes