const cron = require('node-cron');
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const fast2sms = require('fast-two-sms')
require('dotenv').config()


const app=express();





mongoose.connect("mongodb://localhost:27017/wishDB", { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false });
mongoose.set("useCreateIndex", true);

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


const userSchema = new mongoose.Schema({
    email:String,
    dateAndMsg: [{name:String, tel:String , date: String , message: String}]
});

userSchema.plugin(passportLocalMongoose);


const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());







app.get("/",function(req,res){
   res.render("home");
});

app.get("/register",function(req,res){
    res.render("register");
});

app.get("/login",function(req,res){
   res.render("login");
});

app.get("/inside",function(req,res){
  if(req.isAuthenticated()){
      res.render("inside");
  }else{
      res.redirect("/register");
  }
});


app.post("/register", function (req, res) {

    User.register({ username: req.body.username, email:req.body.email }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/inside");
            });
        }
    });

});
app.post("/login", function (req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
            res.redirect("/inside");
            });
        }
    });

});

app.post("/add",function(req,res){
    if(req.isAuthenticated()){

        // console.log(req.user);
        const new_name = req.body.name;
        const new_tel = req.body.tel;
        const new_event = req.body.event;
        const new_message = req.body.message;

        const friendNew = {
            name: new_name,
            tel: new_tel,
            date: new_event,
            message: new_message
        };
        User.findOneAndUpdate(
            { username :req.user.username},
            { $push: { dateAndMsg: friendNew } },
            { upsert: true },
            function (error, success) {
                if (error) {
                    console.log(error);
                } else {
                    res.redirect("/inside");
                }
            }
        );


    }
});




 
cron.schedule('0 1 * * *', () => {
    // console.log('running a task everyday at 1am');
    User.find({}, function (err, users) {

        if (users.length > 0) {

            const currentDate = new Date();
            const day = (currentDate.getDate());
            const month = (currentDate.getMonth() + 1);
            const year = String(currentDate.getFullYear());
            var fulldate = "";
            if (month < 10 && day < 10) {
                const mm = String(month);
                const dd = String(day);
                fulldate = year + "-0" + mm + "-0" + dd;
            } else if (month < 10) {
                const mm = String(month);
                const dd = String(day);
                fulldate = year + "-0" + mm + "-" + dd;
            } else if (day < 10) {
                const mm = String(month);
                const dd = String(day);
                fulldate = year + "-" + mm + "-0" + dd;
            }

            var names = [];
            var number = [];
            var messages = [];
            for (var i = 0; i < users[0].dateAndMsg.length; i++) {
                if (users[0].dateAndMsg[i].date === fulldate) {
                    names.push(users[0].dateAndMsg[i].name);
                    number.push(users[0].dateAndMsg[i].tel);
                    messages.push(users[0].dateAndMsg[i].message);

                }
            }

            console.log(names);
            console.log(number);
            console.log(messages);
            for (var i = 0; i < names.length; i++) {
                var options = {
                    authorization: process.env.API,
                    message: messages[i],
                    numbers: [number[i]]
                }
                fast2sms.sendMessage(options).then(response => {
                    console.log(response);
                });

            }

        }
    });

});
  



app.listen(3000,function(){
 console.log("on port 3000");
});

