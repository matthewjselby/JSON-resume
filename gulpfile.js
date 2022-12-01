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
import minimist from 'minimist';

const __dirname = path.resolve(path.dirname(''));
const options = minimist(process.argv.slice(2), {
    string: ['rin', 'rout'],
    default: {
        'rin': path.join(__dirname, 'resume.json'),
        'rout': path.join(__dirname, 'resume.pdf')
    }
});

const clean = (done) => {
    // Remove dist
    deleteSync(['dist', 'pdf', 'resume.pdf']);
    done();
}

gulp.task('clean', clean);

// Resume related tasks

const buildResume = async () => {
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
    let resume = JSON.parse(fs.readFileSync(options.rin));
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
const serveResume = () => {
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
const watchResume = () => {
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
        `${options.rin}`,
    ], (done) => {
        buildResume().then(() => {
            browserSync.reload();
        });
        done();
    });
};

const resumeToPdf = async () => {
    await buildResume();
    let html = fs.readFileSync(path.join(__dirname, '/dist/resume.html'), 'utf-8');
    // Launch browser and populate with document
    let browser = await puppeteer.launch();
    let page = await browser.newPage();
    await page.setContent(html, {
        waitUntil: 'networkidle0'
    });
    await page.pdf({
        path: options.rout,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        printBackground: true,
        scale: 1.0,
        margin: {
            top: 0,
            right: 0,
            bottom: 0,
            right: 0
        }
    });
    await browser.close();
    return Promise.resolve();
}

gulp.task('buildResume', buildResume);
gulp.task('viewResume', gulp.series(buildResume, gulp.parallel(serveResume, watchResume)));
gulp.task('resumeToPdf', resumeToPdf);