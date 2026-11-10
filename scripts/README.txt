LOCAL WEBSITE TOOLS (WINDOWS)

Use Quarto 1.10 or newer. The VS Code workspace is configured for the official
portable Quarto 1.10.20 distribution at .tools/quarto-1.10.20/bin/quarto.exe.
The executable is not committed. For a fresh checkout, download it from
https://github.com/quarto-dev/quarto-cli/releases/tag/v1.10.20 and extract it
at that location, or change quarto.path in .vscode/settings.json to your
installed Quarto executable. Reload the VS Code window after changing it.

Open a root .qmd file and run Quarto Preview, or use the Website: preview
task for a fixed http://127.0.0.1:5511/ address. Use one preview at a time.
Do not render the same checkout separately while its preview is running.
The Website: render task is for a checkout without an active preview.

Website: update JMP asks for a final PDF and the date printed on the paper.
It updates papers/Lamproye_JMP.pdf and the shared date in _variables.yml.
It never commits, pushes, or publishes automatically. Review the PDF and date,
then publish the reviewed changes through the normal GitHub workflow.

Optional browser tests require Node.js, Playwright, and Microsoft Edge.
Set PREVIEW_URL to an existing Quarto preview address. The scripts default
to port 6756; set it to http://127.0.0.1:5511 for the Website: preview task.
PLAYWRIGHT_MODULE can point to an existing Playwright installation; otherwise
the scripts load require('playwright'). Run from the repository root:

node scripts/test-home-preview.cjs
node scripts/test-pdf-preview.cjs

The tests create screenshots in ignored tmp/, use disposable browser profiles,
and leave the website preview running. The PDF reader is local-only; public
visitors continue to receive the original direct PDF links.
