// app/routes.js


module.exports = function(app, passport) {
	var mongoose = require('mongoose');
	var conn = mongoose.connection;
	var url = __dirname + '/../views/';
	var path = require('path');
	var fs = require('fs');
	var multer = require('multer');
	var upload = multer({ dest: 'public/' });
	var Grid = require('gridfs-stream');
	var videoPath = path.join(__dirname, '../public/');
	var Exercise = require('./models/exercise');
	var Scenario = require('./models/scenario');
	var Session = require('./models/session');
	var rooms = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'J', 'K', 'L', 'M', 'N'];
	var MAX_PEOPLE = 15; // can be changed



	app.get('/', function(req, res) {
		//res.sendFile(path.resolve(url + 'index.html'));
		res.render('main.ejs', {message: req.flash('loginMessage')});
	});

	app.get('/adminWait', function(req, res) {
		var sessionID = parseInt(req.query.sessionID);
		var currRound = parseInt(req.query.currRound);
		Session.findOneAndUpdate({activeSessionID: sessionID},
		{$inc: {currRound: 0}},
		{new: true}, function(err, model) {
			if (err) console.err(err);
			Exercise.find({'_id': model.exerciseID}).lean().exec(function(err1, results) {
				if (err1) console.err(err1);
				if (currRound == (results[0].numOfRounds+1)) {
					res.redirect('/finishSession?sessionID='+sessionID);
				}
				else {
					res.render('adminWait.ejs', {sessionID: sessionID, currRound: currRound});
				}
			});
		});
	});

	app.post('/adminWait', function(req, res) {
		var sessionID = parseInt(req.body.sessionID);
		var currRound = parseInt(req.body.currRound);
		Session.findOneAndUpdate({activeSessionID: sessionID},
		{$inc: {currRound: 0}},
		{new: true}, function(err, model) {
			if (err) console.err(err);
			Exercise.find({'_id': model.exerciseID}).lean().exec(function(err1, results) {
				if (err1) console.err(err1);
				if (currRound == (results[0].numOfRounds+1)) {
					res.redirect('/finishSession?sessionID='+sessionID);
				}
				else {
					res.render('adminWait.ejs', {sessionID: sessionID, currRound: currRound});
				}
			});

		});
	});

	app.post('/submitResults', function(req, res) {
		var currRound = parseInt(req.body.currRound);
		var exerciseID = parseInt(req.body.exerciseID);
		var sessionID = parseInt(req.body.sessionID);
		var disruptionSelection = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
		disruptionSelection[0] = req.body.A;
		disruptionSelection[1] = req.body.B;
		disruptionSelection[2] = req.body.C;
		disruptionSelection[3] = req.body.D;
		disruptionSelection[4] = req.body.E;
		disruptionSelection[5] = req.body.F;
		disruptionSelection[6] = req.body.G;
		disruptionSelection[7] = req.body.J;
		disruptionSelection[8] = req.body.K;
		disruptionSelection[9] = req.body.L;
		disruptionSelection[10] = req.body.M;
		disruptionSelection[11] = req.body.N;
		for (var ii = 0; ii < rooms.length; ii++) {
			if (disruptionSelection[ii] != null && disruptionSelection[ii] != -1) {
				Session.findOneAndUpdate({roomNumber: String(rooms[ii]), activeSessionID: sessionID, currRound: 1},
					{$set: {'nextScenario': disruptionSelection[ii]}, 
					$inc: {'currRound': 1}},
					{new: true},
					function(err, model) {
						if (err) throw err;
					}
				);

				// MAX of 15 people per room. Can change.
				for (var i = 1; i <= MAX_PEOPLE; i++) {
					Session.findOneAndUpdate({roomNumber: String(rooms[ii]), activeSessionID: sessionID, currRound: {$gt: 1}, 'students.id' : i},
						{$set: {'nextScenario': null, 'students.$.nextScenario': disruptionSelection[ii]}, 
						$inc: {'currRound': 1}},
						function(err, model) {
							if (err) throw err;
						}
					);
				}
			}
			else { // at least one scenario is not selected
				res.redirect('/assignDisruption?sessionID='+sessionID, {currRound: currRound});
			}
		}
		currRound++;
		res.redirect('/adminWait?sessionID='+sessionID+"&currRound="+currRound);
	});

	app.get('/adminlogin', function(req, res) {
		res.render('login.ejs', {message: req.flash('loginMessage')});
	});

	app.get('/assignDisruption', function(req, res) { 
		var sessionID = parseInt(req.query.sessionID);
		var currRound = req.body.currRound;
		Session.find({activeSessionID: sessionID}).lean().exec(function(err, results) {
				Exercise.find({'_id': results[0].exerciseID}).lean().exec(function(err1, exerciseRes) {
					if (err1) console.err(err1);

					var scenarios = [];
					if (exerciseRes.length == 0) {

						for (var ii = 0; ii < exerciseRes.scenarios.length; ii++) {
							if (exerciseRes.scenarios[ii].round == results[0].currRound) {
								scenarios.push(exerciseRes.scenarios[ii]);
							}
						}
					}
					else {
						for (var ii = 0; ii < exerciseRes[0].scenarios.length; ii++) {
							if (exerciseRes[0].scenarios[ii].round == results[0].currRound) {
								scenarios.push(exerciseRes[0].scenarios[ii]);
							}
						}
					}

					res.render('assignDisruption.ejs', {scenarioChoices: scenarios, allRooms: rooms, sessionID: sessionID, currRound: currRound});
				});
		});
	});

	app.post('/assignDisruption', function(req, res) {
		var currRound = req.body.currRound;
		var sessionID = parseInt(req.body.sessionID);
		Session.find({activeSessionID: sessionID}).lean().exec(function(err, results) {
				Exercise.find({'_id': results[0].exerciseID}).lean().exec(function(err1, exerciseRes) {
					if (err1) console.err(err1);

					var scenarios = [];
					if (exerciseRes.length == 0) {

						for (var ii = 0; ii < exerciseRes.scenarios.length; ii++) {
							if (exerciseRes.scenarios[ii].round == results[0].currRound) {
								scenarios.push(exerciseRes.scenarios[ii]);
							}
						}
					}

					else {
						for (var ii = 0; ii < exerciseRes[0].scenarios.length; ii++) {
							if (exerciseRes[0].scenarios[ii].round == results[0].currRound) {
								scenarios.push(exerciseRes[0].scenarios[ii]);
							}
						}
					}

					res.render('assignDisruption.ejs', {scenarioChoices: scenarios, allRooms: rooms, sessionID: sessionID, currRound: currRound});
				});
		});
	});


	app.get('/finishSession', function(req, res) {
		var sessionIDToRemove = req.query.sessionID;
		// Session.findOneAndUpdate(
		// 	{"activeSessionID": sessionIDToRemove},
		// 	{$inc: {currRound: 1}},
		// 	function(err, model) {
		// 		if (err) throw err;
		// 		console.log("Incremented successfully");
		// 	}
		// );
		res.render('finishAdmin.ejs', {sessionID: sessionIDToRemove});
	});

	app.post('/finishSession', function(req, res) {
		var sessionIDToRemove = req.body.sessionID;
		Session.remove({'activeSessionID': sessionIDToRemove}, function(err, results) {
			if (err) console.err(err);
			console.log("Completed Session " + results.activeSessionID + " and removed from DB");
		});
		res.redirect('/admin');
	});

	app.get('/studentlogin', function(req, res) {
		res.render('studentLogin.ejs', {message: req.flash('loginMessage')});
	});

	app.post('/createSession', function(req, res) {
		var exerciseID = req.body.exerciseButtons;
		Exercise.findOne({'_id': exerciseID, 'enabled': true}).lean().exec( function(err, results) {
			if (err) console.err(err);
			res.render('createSession.ejs', {exerciseName: results.title, exerciseID: exerciseID});
		});
	});

	app.post('/sessionAdmin', function(req, res) {
		var sessionID = Math.random() * (999999 - 100000) + 100000;
		sessionID = Math.round(sessionID);
		for (var i = 0; i < rooms.length; i++) {
			var session = new Session ({
				roomNumber: rooms[i],
				activeSessionID: sessionID,
				nextScenario: 0,
				exerciseID: req.body.exerciseID,
				currRound: 1
			});
			session.save(function(err) {
				if (err) { throw err; }
				console.log("Session saved succesfully");
			});
		}
		var currRound = 1;
		res.render('session.ejs', {exerciseID: req.body.exerciseID, sessionID: sessionID, currRound: currRound});
	});

	app.get('/deleteExercise', function(req, res) {

		Exercise.find({'enabled': true}).lean().exec( function(err, results) {
			if (err) console.err(err);
			res.render('deleteExercise.ejs', {exercises: results});
		});
	});

	app.post('/deleteExercise', function(req, res) {
		var exerciseID = req.body.exerciseChecks;
		if (exerciseID) {
			Exercise.findByIdAndUpdate(
						exerciseID,
						{$set: {'enabled': false}},
						{new: true},
							function(err, model) {
									if (err) throw err;
							}
			);
		}
		res.redirect('/admin');
	});

	app.get('/selectExercise', function(req, res) {
		Exercise.find({'enabled': true}).lean().exec( function(err, results) {
			if (err) console.err(err);
			res.render('selectExercise.ejs', {exercises: results});
		});
	});

	app.post('/display', function(req, res) {
		var role = req.body.role;
		var room = req.body.room;
		var sid = req.body.studentID;
		var sess = req.body.sessionID;

		Session.findOne({'roomNumber': room, 'activeSessionID' : sess}).lean().exec( function(err, result) {
			//get the session
			var id = result.exerciseID; //pull out exercise ID for that session
			var currentRound = result.currRound;
			var next;
			var isDone = false;
			var students = result.students;
			for (var i = 0; i < students.length; i++) {
				if (students[i].id == sid) {
					next = students[i].nextScenario;
					isDone = students[i].firstRoundDone;
					break;
				}
			}

			Exercise.findOne({'_id': id}).lean().exec( function(err, exercise) {
				//find session ID;
				if (currentRound > exercise.numOfRounds + 1) {
					// render finish page
					console.log("finished exercise");
					res.render('finish.ejs');
					return;
				} else {
					// check if can proceed
					if (result.nextScenario != null && result.nextScenario != 0 && !isDone) {
						next = result.nextScenario;
						Session.findOneAndUpdate(
							{"roomNumber": room, "activeSessionID" : sess, "students.id": parseInt(sid)},
							{$set: {"students.$.firstRoundDone": true}},
							{new: true},
							function(err, result) {
								if (err) throw err;
								console.log("Set firstRoundDone to true successfully");
							}
						);
					}
					if (next == null && currentRound == exercise.numOfRounds + 1) {
						res.render('finish.ejs');
						return;
					}
					if (next == null) {
						res.render('survey2.ejs', {role: role, room: room, message: 'Please wait until admin chooses next scenario', url: "", sessionID: sess, studentID: sid});
						return;
					}

					if (next == 0) {
						res.render('survey2.ejs', {role: role, room: room, message: 'Please wait until admin chooses the first scenario', url: "", sessionID: sess, studentID: sid});
						return;
					}

					//set nextScenario of studentID to NULL
					Session.findOneAndUpdate(
						{"roomNumber": room, "activeSessionID" : sess, "students.id": parseInt(sid)},
						{$set: {"students.$.nextScenario": null}},
						{new: true},
						function(err, model) {
							if (err) throw err;
							console.log("Set nextScenario of studentID to null successfully");
						}
					);

					if (currentRound == 1) {
						for (var i = 0; i < exercise.scenarios.length; i++) {
		 					if (exercise.scenarios[i].round == 1){
		 						var results = exercise.scenarios[i];
		 						res.render('scenario.ejs', {text: results.text, role: role, room: room, sessionID: sess, studentID: sid});
		 						return;
		 					}
	 					}
					}
					else {
						for (var i = 0; i < exercise.scenarios.length; i++) {
		 					if (exercise.scenarios[i].round == currentRound - 1 && exercise.scenarios[i].id == next){
		 						var results = exercise.scenarios[i];
	 							res.render('scenario.ejs', {text: results.text, role: role, room: room, sessionID: sess, studentID: sid});
		 						return;
		 					}
	 					}
					}
					console.log("line 347 in /display error: possibly undefined var results");
				 }
			});
		});
	});

	app.post('/displaySurvey', function(req, res) {
		var sess = req.body.sessionID;
		var sid = req.body.studentID;
		var room = req.body.room;
		Session.findOne({'roomNumber': room, 'activeSessionID' : sess}).lean().exec( function(err, result) {
			if (err) throw err;
			var exerciseID = result.exerciseID;
			Exercise.findOne({'_id': exerciseID}).lean().exec( function(err1, exercise) {
				if (err1) throw err1;
				if (req.body.role === 'ceo') {
					res.render('survey.ejs', {url: exercise.ceoSurvey, role: req.body.role, room: req.body.room, sessionID: sess, studentID: sid, team: exercise.teamMemberSurvey});
				} else if (req.body.role === 'team') {
					res.render('survey.ejs', {url: exercise.teamMemberSurvey, role: req.body.role, room: req.body.room, sessionID: sess, studentID: sid, team: exercise.teamMemberSurvey});
				} else {
					res.render('survey.ejs', {url: exercise.observerSurvey, role: req.body.role, room: req.body.room, sessionID: sess, studentID: sid, team: exercise.observerSurvey});
				}
			});
		});
	});

	app.post('/team', function(req, res) {
		var sess = req.body.sessionID;
		var sid = req.body.studentID;
		var surveyURL = req.body.survey;
		res.render('survey2.ejs', {url: surveyURL, role: req.body.role, room: req.body.room, message: "", sessionID: sess, studentID: sid});
	});

	app.post('/wait', function (req, res) {
		var taken = currentSession.activeRoles;
		var str = (req.body.role).split("//");
		if (taken.includes(str[0]) || str[0] == null) {
			res.redirect('/selectRoles');
		} else {
			Session.findOneAndUpdate(
				{roomNumber: currentRoom},
				{$push: {activeRoles: str[0]}},
				{safe: true, upsert: true},
					function(err, model) {
						if (err) throw err;
					}
			);
			console.log(currentSession.activeRoles);
			res.render('wait.ejs', {role: str[0], description: str[1]});
		}
	});

	// app.post('/startScenario', function(req, res) {
	// 	if (currentExercise.scenarios[sCount].videoURL == null || currentExercise.scenarios[sCount].videoURL == "") {
	// 		res.render('text.ejs', {scenario: currentExercise.scenarios[sCount], answerer: currentExercise.answerer,
	// 								role: req.body.role, description: req.body.description});
	// 	} else {
	// 		res.render('video.ejs', {scenario: currentExercise.scenarios[sCount], answerer: currentExercise.answerer,
	// 								role: req.body.role, description: req.body.description});
	// 	}
	// });

	// // show questions to students
	// app.post('/response', function(req, res) {
	// 	// add group answer to database
	// 	if (req.body.answer != null && req.body.answer != "") {
	// 		var scenarioAnswer = new ScenarioAnswer({
	// 			scenarioID: sCount + 1,
	// 			text: req.body.answer,
	// 			surveyAnswers: []
	// 		});
	// 		Answer.findOneAndUpdate(
	// 			{'roomNumber': currentRoom, 'sessionID': currentSessionID},
	// 			{$addToSet: {scenarioAnswers: scenarioAnswer}},
	// 			{safe: true, upsert: true},
	// 				function(err, model) {
	// 					if (err) throw err;
	// 				}
	// 		);
	// 	}
	// 	res.render('response.ejs', {scenario: currentExercise.scenarios[sCount], role: req.body.role, description: req.body.description});
	// });

	// collect student survey responses
	// app.post('/collect', function(req, res) {
	// 	var currScenario = currentExercise.scenarios.length;
	// 	var surveyAnswer = new SurveyAnswer({
	// 		role: req.body.role,
	// 		answers: req.body.surveyAnswers
	// 	});
	// 	Answer.findOneAndUpdate(
	// 		{roomNumber: currentRoom, sessionID: currentSessionID, 'scenarioAnswers.scenarioID' : sCount + 1},
	// 		{$push: {'scenarioAnswers.$.surveyAnswers' : surveyAnswer}},
	// 		{safe: true, upsert: true},
	// 			function(err, model) {
	// 				if (err) throw err;
	// 				console.log("survey answer inserted successfully!")
	// 			}
	// 	);
	// 	sCount++;
	// 	if (sCount == currScenario) { // finished exercise
	// 		res.render('finish.ejs');
	// 	} else { // more scenarios
	// 		if (currentExercise.scenarios[sCount].videoURL == null || currentExercise.scenarios[sCount].videoURL == "") {
	// 			res.render('text.ejs', {scenario: currentExercise.scenarios[sCount], answerer: currentExercise.answerer,
	// 								role: req.body.role, description: req.body.description});
	// 		} else {
	// 			res.render('video.ejs', {scenario: currentExercise.scenarios[sCount], answerer: currentExercise.answerer,
	// 									role: req.body.role, description: req.body.description});
	// 		}
	// 	}
	// });

	app.post('/reset', function(req, res) {
		sCount = 0;
		res.redirect('/');
	});

	// process the admin login form
  	app.post('/login', passport.authenticate('local', {
		successRedirect: '/admin',
		failureRedirect: '/adminLogin',
		failureFlash: true
	}));

	// process the student login form
	app.post('/studentlogin', function(req, res, next) {
		passport.authenticate('local-student', function(err, user, info) {
			if (err) { return next(err); }
			if (!user) { return res.redirect('/studentlogin'); }
			req.logIn(user, function(err) {
				if (err) { return next(err); }
				var sessionID = req.body.activeSessionID;
				var roomNum = req.body.roomNumber;
				Session.findOne({'activeSessionID' : sessionID, 'roomNumber' : roomNum}, function(err, result) {
					if (err) throw err;
					var inc = result.students.length;
					var studentObj = {"id" : inc + 1, "nextScenario" : null, "firstRoundDone": false};
					Session.findOneAndUpdate(
						{roomNumber: roomNum, activeSessionID: sessionID},
						{$push: {'students' : studentObj}},
						{safe: true, upsert: true},
							function(err, model) {
								if (err) throw err;
								console.log("student object inserted successfully!")
							}
					);
					return res.render('roles.ejs', {roomNumber: user.roomNumber, studentID: inc+1, sessionID: sessionID});
				});
			});
		})(req, res, next);
	});

	// admin page. Must be logged in to to visit using function isLoggedIn as middleware
	app.get('/admin', isLoggedIn, function(req, res) {
		res.render('admin.ejs', {user: req.user})
	});

	app.get('/session', isLoggedIn, function(req, res) {
		res.render('student.ejs', {user: req.user})
	});

	// logout
	app.get('/logout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	app.get('/createExercise', function(req, res) {
		res.render('exercises.ejs');
	});

	app.post('/finishSession', function(req, res) {
		var sessionIDToRemove = req.body.sessionID;
		console.log("SessionID: " + sessionIDToRemove);
		Session.findOneAndRemove({'activeSessionID': sessionIDToRemove}, function(err, results) {
			if (err) console.err(err);
			console.log("Completed Session successfully and removed from DB");
		});
		res.redirect('/admin');
	});

	app.post('/createRoles', function(req, res) {
		res.render('roles.ejs', {name: req.body.exerciseName, roles: req.body.roles});
	});

	app.post('/createScenarios', function(req, res) {
		sCount = 0;
		var exercise = new Exercise({
			enabled: true,
			title: req.body.exerciseName,
			numOfRounds: req.body.numOfRounds,
			scenarios: [],
			ceoSurvey: req.body.ceoSurvey,
			teamMemberSurvey: req.body.teamMemberSurvey,
			observerSurvey: req.body.observerSurvey
		});
		exercise.save(function(err) {
			if (err) throw err;
			console.log('Exercise saved succesfully');
		});
		//res.render('createScenario.ejs');
		res.redirect('/displayScenarios');
	});

	app.get('/displayScenarios', function(req, res) {
		Exercise.nextCount(function(err, count) {
			var exerciseID = count - 1;
			Exercise.findOne({'_id': exerciseID}).lean().exec(function(err, result) {
				console.log("Debugging:" + result._id);
				res.render('displayScenarios.ejs', {scenarios: result.scenarios});
			})
		})
	});

	app.post('/getScenario', upload.single('myVideo'), function(req, res) {
		//videoPath = videoPath + req.file.filename;
		if (req.body.text != null) {
			Exercise.nextCount(function(err, count) {
				var exerciseID = count - 1;

				// find length of scenarios array from current exercise
				Exercise.findOne({'_id': exerciseID}).lean().exec( function(err, result) {
					// var exCount = result.scenarios.length + 1;
					sCount += 1;
					var scenario = new Scenario({
						name: req.body.name,
						id: sCount,
						round: req.body.round,
						videoURL: null,
						text: req.body.text
					});

					// find and update exercise with current scenario
					Exercise.findByIdAndUpdate(
						exerciseID,
						{$push: {scenarios: scenario}},
						{safe: true, upsert: true},
							function(err, model) {
									if (err) throw err;
							}
					);
				});
			});
		} else {
			Exercise.nextCount(function(err, count) {
				var exerciseID = count - 1;

				// find length of scenarios array from current exercise
				Exercise.findOne({'_id': exerciseID}).lean().exec( function(err, result) {
					// var exCount = result.scenarios.length + 1;
					sCount += 1;
					console.log("exercise count: " + exCount);
					var scenario = new Scenario({
						name: req.body.name,
						id: sCount,
						round: req.body.round,
						videoURL: req.body.myVideo,
						text: null
					});

					// find and update exercise with current scenario
					Exercise.findByIdAndUpdate(
						exerciseID,
						{$push: {scenarios: scenario}},
						{safe: true, upsert: true},
							function(err, model) {
								if (err) throw err;
							}
					);
				});
			});
		}
		console.log(req.body.survey);
		res.redirect('/displayScenarios');
	});

	// app.post('/addSurvey', function(req, res) {
	// 	Exercise.nextCount(function(err, count) {
	// 		var exerciseID = count - 1;
	//
	// 		// find length of scenarios array from current exercise
	// 		Exercise.findOne({'_id': exerciseID}).lean().exec( function(err, result) {
	// 			var exCount = result.scenarios.length + 1; // set this as scenario id
	// 			console.log("exercise count: " + exCount);
	// 			var scenario = new Scenario({
	// 				_id: exCount,
	// 				videoURL: req.body.videoURL,
	// 				text: req.body.text,
	// 				question: req.body.question,
	// 				survey: req.body.surveys
	// 			});
	//
	// 			// find and update exercise with current scenario
	// 			Exercise.findByIdAndUpdate(
	// 		    exerciseID,
	// 		    {$push: {scenarios: scenario}},
	// 		    {safe: true, upsert: true},
	// 			    function(err, model) {
	// 			        if (err) throw err;
	// 			    }
	// 			);
	// 		});
	// 	});
	// 	res.render('finishCreateExercise.ejs');
	// });

	app.get('/scenarioRedirect', function(req, res) {
		res.render('createScenario.ejs');
	});

	app.get('/homeRedirect', function(req, res) {
		res.redirect('/admin');
	});

	// UPLOAD VIDEO LOCALLY===============
	// app.post('/upload', upload.single('myVideo'), function(req, res) {
	// 	//res.send(req.file.filename);
	// 	videoPath = videoPath + req.file.filename;
	// 	var scenario = new Scenario({
	// 		videoURL: req.file.filename,
	// 		text: null,
	// 		question: req.body.question,
	// 		survey: null
	// 	});
	// 	//res.download(videoPath, req.file.originalname);
	// 	res.render('survey.ejs', {number: req.body.survey, scenario: scenario});
	// });
};


// route middleware to make sure user is logged in
function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) return next();
	// if not logged in, redirect to homepage
	res.redirect('/');
}
