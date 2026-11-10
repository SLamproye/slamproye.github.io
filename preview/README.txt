LOCAL QUARTO PDF PREVIEW

pdf-preview.js opens the CV and JMP in an HTML PDF reader only when the website is
running on localhost inside an initialized Quarto preview iframe. Public
visitors and ordinary browser tabs retain the original direct PDF links.
No PDF data is sent to an external viewer or service.

The reader is Mozilla PDF.js 6.5.438, official legacy distribution (for
compatibility with VS Code's embedded Chromium). LICENSE is retained in pdfjs/.
Source: https://github.com/mozilla/pdf.js/releases/tag/v6.5.438
Archive: pdfjs-6.5.438-legacy-dist.zip
Verified SHA-256:
55138aa33b5f1f6f68809895338b947f395f344eb6381d424b2420d6daa6a844

The viewer distribution is unmodified. Source maps and Mozilla's sample PDF
are omitted. The live CV is loaded from files/Lamproye_CV.pdf, so replacing
that PDF also updates the local reader without duplicating the document.
