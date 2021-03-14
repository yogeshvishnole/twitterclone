import express from 'express';
import bcrypt from 'bcrypt';
import User from '../models/userModel';
const router = express.Router();

router.get('/', (req, res, next) => {
  res.status(200).render('register');
});

router.post('/', async (req, res, next) => {
  var firstname = req.body.firstname.trim();
  var lastname = req.body.lastname.trim();
  var username = req.body.username.trim();
  var email = req.body.email.trim();
  var password = req.body.password;

  var payload = req.body;

  if (firstname && lastname && username && email && password) {
    var user = await User.findOne({
      $or: [{ username: username }, { email: email }],
    }).catch(error => {
      console.log(error);
      payload.errorMessage = 'Something went wrong.';
      res.status(200).render('register', payload);
    });

    if (user == null) {
      // No user found
      var data = req.body;
      data.password = await bcrypt.hash(password, 10);

      User.create(data).then(user => {
        req.session.user = user;
        return res.redirect('/');
      });
    } else {
      // User found
      if (email == user.email) {
        payload.errorMessage = 'Email already in use.';
      } else {
        payload.errorMessage = 'Username already in use.';
      }
      res.status(200).render('register', payload);
    }
  } else {
    payload.errorMessage = 'Make sure each field has a valid value.';
    res.status(200).render('register', payload);
  }
});

export default router;
