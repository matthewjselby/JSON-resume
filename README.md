Inspired by projects like [jsonresume.org](https://jsonresume.org). Why is making a decent looking resume so difficult? One wrong move in Word and your whole document is garbled. If you want anything unique, you have to learn some obscure publishing software. Editing your resume should be as easy as editing a text document. You shouldn't have to fuss over the layout every time you add something.

# Why not jsonresume?

1) jsonresume is old. Lots of the tooling associated with it is outdated. This project removes any dependence on external tooling associated with jsonresume, instead using gulp to make the JSON information available to the handlebars template.
2) jsonresume enforces a specific schema (most of which I don't use, and some of which I disagree with). This project uses a non-opinionated JSON schema. You can add or remove whatever you want, and reference it directly via handlebars.
3) Perhaps the biggest reason, jsonresume did not render to PDF well. Resume websites are cool, but at some point you're going to want a document. This project tries to render a PDF based on the HTML template in an attractive way, preserving desired margins and breaking pages at the correct points (more on this below).

# Usage

Clone the repository and run `npm i`. This will install the necessary dependencies.

To build the website, run `npx gulp build` from the project directory. This will compile the handlebars template and output resume.html in the /dist folder. You can serve this file from your website or do anything else you can do with HTML.

To see the website in a browser, run `npx gulp test`. The site will update live with changes to the handlebars template, the scss file, and the json resume file.

To generate a pdf of your resume, run `npx gulp generatePdf` from the project directory. The pdf will be generated in the project directory as resume.pdf by default.

You can specify a JSON input file using the command line argument `--i /path/to/your/resume.json`. This will work with any of the commands listed above. If you do not specify an input file, the commands will use resume.json in the root of the project directory.

Similarly, you can specify a PDF output file using the command line argument `--o /path/to/your/resume.pdf`. This is only applicable to the `generatePdf` command above.

# PDF Rendering

Puppeteer is used to launch a headless browser, which renders the website. CSS media rules are used to ensure `section` divs are not broken across pages. Keep this in mind when modifying the handlebars template. Anything you do not want broken across a page should be encapsulated in a `section` class.