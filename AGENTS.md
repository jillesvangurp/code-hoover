## Build

- Install dependencies with `npm install`.
- Run the complete verification suite with `npm run check`.
- Build the production app with `npm run build`.

## Dependencies

- Runtime and development dependencies are managed with npm.
- Commit `package-lock.json` whenever dependencies change.
- The application uses React and TypeScript and is built with Vite.

## Styling

- tailwind 4.x with daisyui as the component framework
- prefer daisyui components over custom tailwind styling; that's why it's there. Styling should be mostly minimal.
- we have light mode and darkmode and changes need to stick with the black and white themes

## Tests

- Use Vitest and Testing Library.
- Add domain tests for serialization and QR payload changes, and interaction tests for user-visible flows.

## Codex Skills

- For visual/frontend verification, use the installed `playwright` and `screenshot` skills.
- For security-sensitive changes, use `security-best-practices`.
- For GitHub PR review or CI follow-up, use `gh-address-comments`, `gh-fix-ci`, and `yeet` when relevant.
- Formation company skills are installed from `/Users/ianhannigan/GIT/formation/company-skills` into `~/.codex/skills`; useful local references for this repo include `copy-tone`, `website-asset-workflow`, `asset-management`, and `formation-workstation-update`.
