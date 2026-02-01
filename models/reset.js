const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const { userSchema } = require('./user');

const resetSchema = new mongoose.Schema({
    username: String,
    resetPasswordToken: String,
    resetPasswordExpires: Number
}); 

try {
    resetSchema.plugin(passportLocalMongoose.default || passportLocalMongoose);
} catch (err1) {
    try {
        resetSchema.plugin(passportLocalMongoose.plugin);
    } catch (err2) {
        try {
            resetSchema.plugin(passportLocalMongoose());
        } catch (err3) {
            console.log("Plugin non appliqué, utilisation sans plugin");
        }
    }
}
module.exports = mongoose.model("Reset", resetSchema);