const mongoose = require('mongoose');
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: String, 
    password: String
});
exports.userSchema = userSchema;

try {
    userSchema.plugin(passportLocalMongoose.default || passportLocalMongoose);
} catch (err1) {
    try {
        userSchema.plugin(passportLocalMongoose.plugin);
    } catch (err2) {
        try {
            userSchema.plugin(passportLocalMongoose());
        } catch (err3) {
            console.log("Plugin non appliqué, utilisation sans plugin");
        }
    }
}

module.exports = mongoose.model("User",userSchema);