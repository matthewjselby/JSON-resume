module.exports.register = (handlebars) => {
    handlebars.registerHelper('prettyLink', function(url) {
        let nameRegex = /(https?\:\/\/)?(www.)?(.*)/;
        let linkName = url.match(nameRegex)[3];
        return new handlebars.SafeString(`<a href="${url}">${linkName}</a>`);
    });
    handlebars.registerHelper('linkEmail', function(email) {
        return new handlebars.SafeString(`<a href="mailto:${email}">${email}</a>`);
    });
    handlebars.registerHelper('prettyDate', function(dateString) {
        if (dateString == "") {
            return "current"
        }
        let date = new Date(dateString);
        let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return `${months[date.getMonth() + 1]} ${date.getFullYear()}`;
    });
    handlebars.registerHelper('yearFromDate', function(dateString) {
        let date = new Date(dateString);
        return `${date.getFullYear()}`;
    });
};