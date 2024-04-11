import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import session from "express-session";
import bcrypt from "bcrypt";
import pg from "pg";
import passport from "passport";
import {Strategy} from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import env from "dotenv";

const app = express();
const port = 4000;
const API_URL = "http://localhost:3000";
const saltRounds = 10;
env.config();

app.use(express.static("public"));

const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//Initialising session
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true
}))

//After session was initialized, using passport
app.use(passport.initialize())
app.use(passport.session())
  
app.get("/", (req, res) => {
    res.render("home.ejs");
});

app.get("/login", (req, res) => {
    res.render("login.ejs");
});
  
app.get("/register", (req, res) => {
    res.render("register.ejs");
});

//GET all the top headlines in India
app.get("/home", async (req, res) => {
    if (req.isAuthenticated()){
      try {
        const response = await axios.get(`${API_URL}/all`);
        // console.log(response.data);
        res.render("index.ejs", { news: response.data});
      } catch (error) {
        res.status(500).json({ message: "Error fetching news" });
      }
    }
    else{
      res.redirect("/login");
    }
});

//FILTER by source
app.get("/source", async(req, res) => {
  try{
    const response = await axios.get(`${API_URL}/source?name=${req.query.source}`);
    res.render("index.ejs",{ news: response.data });
  } catch(err){
    console.log(err)
    res.redirect("/home")
  }
})

//FILTER by keyword
app.get("/filter", async(req, res) => {
  try{
    const response = await axios.get(`${API_URL}/filter?keyword=${req.query.keyword}`);
    res.render("index.ejs",{ news: response.data});
  } catch(err){
    console.log(err)
    res.redirect("/home")
  }
})

//COMMENTS
app.get("/comments", (req, res) => {
  res.render("comments.ejs")
})

app.post("/register", async(req, res) => {
    const email = req.body.username;
    const password = req.body.password;
    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [
          email,
    ]);
    
    if (checkResult.rows.length > 0) {
        res.send("Email already exists. Try logging in.");
    } else {
        //hashing the password and saving it in the database
        bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
            console.error("Error hashing password:", err);
        } else {
            console.log("Hashed Password:", hash);
            const result = await db.query(
             "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING *;",
            [email, hash]
            );
            const user = result.rows[0];
            req.login(user, (err) => {
            console.log(err);
            res.redirect("/home");
            })
        }
        });
    }
    } catch (err) {
        console.log(err);
    }
});

app.get(
    "/auth/google",
    passport.authenticate("google", {
      scope: ["profile", "email"],
    })
);
  
app.get(
    "/auth/google/home",
    passport.authenticate("google", {
      successRedirect: "/home",
      failureRedirect: "/login",
    })
);
  
app.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/home",
      failureRedirect: "/login",
    })
);

passport.use("local",
    new Strategy(async function verify(username, password, cb) {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1 ", [
          username,
        ]);
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const storedHashedPassword = user.password;
          bcrypt.compare(password, storedHashedPassword, (err, valid) => {
            if (err) {
              //Error with password check
              console.error("Error comparing passwords:", err);
              return cb(err);
            } else {
              if (valid) {
                //Passed password check
                return cb(null, user);
              } else {
                //Did not pass password check
                return cb(null, false);
              }
            }
          });
        } else {
          return cb("User not found");
        }
      } catch (err) {
        console.log(err);
      }
    })
);

passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:4000/auth/google/home",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
      },
      async (accessToken, refreshToken, profile, cb) => {
        try {
          //console.log(profile);
          const result = await db.query("SELECT * FROM users WHERE email = $1", [
            profile.email,
          ]);
          if (result.rows.length === 0) {
            const newUser = await db.query(
              "INSERT INTO users (email, password) VALUES ($1, $2)",
              [profile.email, "google"]
            );
            return cb(null, newUser.rows[0]);
          } else {
            return cb(null, result.rows[0]);
          }
        } catch (err) {
          return cb(err);
        }
      }
    )
);

passport.serializeUser((user, cb) => {
    cb(null, user);
});
passport.deserializeUser((user, cb) => {
    cb(null, user);
});


app.listen(port, () => {
    console.log(`Backend server is running on http://localhost:${port}`);
});
