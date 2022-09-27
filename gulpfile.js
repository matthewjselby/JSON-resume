import gulp from 'gulp';
import fs from 'fs';
import express from 'express';
import path from 'path';
import browserSync from 'browser-sync';
import hbs from 'handlebars';
import hbsw from 'handlebars-wax';
import { deleteSync } from 'del';
import dartSass from 'sass';
import gulpSass from 'gulp-sass';
const sass = gulpSass(dartSass);
import through from 'through2';
import puppeteer from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import minimist from 'minimist';

const __dirname = path.resolve(path.dirname(''));
const options = minimist(process.argv.slice(2), {
    string: ['i', 'o'],
    default: {
        'i': path.join(__dirname, 'resume.json'),
        'o': path.join(__dirname, 'resume.pdf')
    }
});

// Remove dist
const clean = (done) => {
    deleteSync(['dist', 'pdf', 'resume.pdf']);
    done();
}

const build = async () => {
    let pathToResume = path.join(__dirname, '/resume.json')
    // Sass -> CSS
    let css = '';
    await new Promise((resolve) => {
        gulp.src('./src/styles.scss')
            .pipe(sass().on('error', sass.logError))
            .pipe(through.obj((file, enc, cb) => {
                css += file.contents.toString();
                cb();
            })).on('finish', () => {
                resolve();
            })
    });
    // Handlebars -> HTML
    let template = fs.readFileSync(path.join(__dirname, '/src/resume.hbs'), 'utf-8');
    let resume = JSON.parse(fs.readFileSync(options.i));
    let handlebars = hbsw(hbs);
    handlebars.helpers('./hbs-helpers.cjs');
    handlebars.partials(path.join(__dirname, '/src/components/') + '**/*.hbs');
    let output = handlebars.compile(template)({
        css: css,
        resume: resume
    });
    if (!fs.existsSync(path.join(__dirname, '/dist'))) {
        fs.mkdirSync(path.join(__dirname, '/dist'));
    }
    fs.writeFileSync(path.join(__dirname, '/dist/resume.html'), output);
    return Promise.resolve();
};

// Serve the resume on port 3000
const serve = () => {
    const app = express();
    const port = 3000;
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '/dist/resume.html'));
    });
    app.listen(port, () => {
        console.log(`Resume being served on port: ${port}`);
    });
};

// Enable hot reloading
const watch = () => {
    let ports = {
        serve: 3000,
        browserSync: 4001
    }

    browserSync.init({
        proxy: `localhost:${ports.serve}`,
        port: ports.browserSync
    });

    gulp.watch([
        './src/**/*.*',
        `${options.i}`
    ], (done) => {
        build().then(() => {
            browserSync.reload();
        });
        done();
    });
};

const generatePdf = async () => {
    await build();
    let html = fs.readFileSync(path.join(__dirname, '/dist/resume.html'), 'utf-8');
    // Launch browser and populate with document
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    await page.setContent(html, {
        waitUntil: 'domcontentloaded'
    });
    // Get page header (includes styles)
    let pageHeader = await page.evaluate(() => {
        return document.head.outerHTML;
    });
    // Parse document and separate into pages
    let pages = await page.evaluate(() => {
        let pages = []
        let sections = document.querySelectorAll('.section');
        let mockPage = document.querySelector('#mock-page');
        let pageHeight = mockPage.clientHeight;
        let currentHeight = 0;
        let currentPage = document.createElement('div');
        currentPage.className = "page";
        pages.push(currentPage);
        sections.forEach((section) => {
            currentHeight += section.clientHeight;
            if (currentHeight > pageHeight) {
                currentHeight = section.clientHeight;
                currentPage = document.createElement('div');
                currentPage.className = "page";
                pages.push(currentPage);
            }
            currentPage.appendChild(section);
        });
        let pagesHTML = []
        pages.forEach((page) => {
            pagesHTML.push(`<body>${page.outerHTML}</body>`);
        });
        return pagesHTML;
    });
    // Load each page into browser individually and grab PDF
    if (!fs.existsSync(path.join(__dirname, '/pdf'))) {
        fs.mkdirSync(path.join(__dirname, '/pdf'));
    }
    let i = 1;
    for (let docPage of pages) {
        await page.setContent(pageHeader + docPage, {
            waitUntil: 'networkidle0'
        });
        await page.pdf({
            path: `./pdf/page${i}.pdf`,
            format: 'Letter',
            displayHeaderFooter: false,
            margin: {
                left: 0,
                bottom: 0,
                right: 0,
                top: 0
            },
            printBackground: true,
            scale: 1.0
        });
        i += 1;
    }
    // Combine each PDF from puppeteer into a single pdf
    let combinedPdf = await PDFDocument.create(); 
    let pdfs = fs.readdirSync(path.join(__dirname, '/pdf'));
    for await (let pdf of pdfs) {
        console.log(pdf);
        let pdfData = fs.readFileSync(path.join(__dirname, `/pdf/${pdf}`));
        let tempPdf = await PDFDocument.load(pdfData);
        for await (let page of await combinedPdf.copyPages(tempPdf, tempPdf.getPageIndices())) {
            combinedPdf.addPage(page);
        }
    }
    let output = await combinedPdf.save();
    fs.writeFileSync(options.o, output);
    deleteSync(path.join(__dirname, '/pdf'));
    await browser.close();
    return Promise.resolve();
}

gulp.task('build', build);
gulp.task('serve', serve);
gulp.task('test', gulp.series(build, gulp.parallel(serve, watch)));
gulp.task('clean', clean);
gulp.task('generatePdf', generatePdf);