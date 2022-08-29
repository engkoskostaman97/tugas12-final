const express = require('express')
const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')

const db = require('./connection/db')
const upload = require('./middleware/fileUpload')

const app = express()
const port = 7000

app.set('view engine', 'hbs') // set view engine hbs
app.use('/assets', express.static(__dirname + '/assets')) // path folder assets
app.use('/uploads', express.static(__dirname + '/uploads')) // path folder assets
app.use(express.urlencoded({ extended: false }))


app.use(flash())

app.use(session({
    secret: 'welcom',
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 2 * 60 * 60 * 1000 // 2JAM
    }
}))

app.get('/contact', function (request, response) {
    response.render('contact')
})
db.connect(function (err, client, done) {
    if (err) throw err // menampilkan error koneksi database

    app.get('/', function (request, response) {

        console.log(request.session);

        client.query(`SELECT tb_projects.id, tb_projects.title, tb_projects.start_date,tb_projects.end_date,
        tb_projects.content,tb_projects.technologies, tb_projects.image,tb_projects.user_id,  
        tb_user.name as user FROM tb_projects
        LEFT JOIN tb_user ON tb_projects.user_id = tb_user.id 
        ORDER BY id DESC`, function (err, result) {
            if (err) throw err // menampilkan error dari query



            let data = result.rows
            // console.log(result.rowCount)

            let dataBlog = data.map(function (item) {
                return {
                    ...item,

                    duration: getDistanceTime(new Date(item.start_date), new Date(item.end_date)),
                    isLogin: request.session.isLogin,
                }
            })

            // console.log(dataBlog);
            let filterBlog
            if (request.session.user) {
                filterBlog = dataBlog.filter(function (item) {
                    return item.user_id === request.session.user.id
                })
                // console.log(filterBlog);
            }

            let resultBlog = request.session.user ? filterBlog : dataBlog

            response.render('index', { dataBlog: resultBlog, user: request.session.user, isLogin: request.session.isLogin })
        })
    })


    app.get('/blog-detail/:idParams', function (request, response) {
        if (!request.session.user) {
            request.flash('danger', 'Silahkan login!')
            return response.redirect('/login')
        }
        let id = request.params.idParams

        db.connect(function (err, client, done) {
            if (err) throw err // menampilkan error koneksi database

            let query = `SELECT * FROM tb_projects WHERE id=${id}`

            client.query(query, function (err, result) {
                if (err) throw err // menampilkan error dari query

                // console.log(result.rows[0].post_at);
                let data = result.rows
                let dataBlog = data.map(function (item) {
                    return {
                        ...item,
                        start_date: getFullTime(item.start_date),
                        end_date: getFullTime(item.end_date),
                        duration: getDistanceTime(new Date(item.start_date), new Date(item.end_date))

                    }
                })

                response.render('blog-detail', { data: dataBlog[0] })
            })

        })

    });

    app.get("/myproject", function (request, response) {
        if (!request.session.user) {
            request.flash('danger', 'Silahkan login!')
            return response.redirect('/login')
        }

        response.render('myproject', { user: request.session.user, isLogin: request.session.isLogin })

    });
    app.post('/myproject', upload.single('inputImage'), function (request, response) {

        // console.log(request.body);
        let title = request.body.inputTitle;
        let startDate = request.body.inputStartDate;
        let endDate = request.body.inputEndDate;
        let content = request.body.inputContent;
        let android = request.body.android;
        let react = request.body.react;
        let nodejs = request.body.nodejs;
        let squarejs = request.body.squarejs;

        // console.log(request.file.filename);
        const image = request.file.filename

        db.connect(function (err, client, done) {
            if (err) throw err // menampilkan error koneksi database
            const userId = request.session.user.id
            let query = `INSERT INTO tb_projects (title,start_date,end_date, content,technologies,image,user_id) VALUES
                        ('${title}','${startDate}','${endDate}','${content}','{"${android}","${react}","${nodejs}","${squarejs}"}','${image}',${userId});`

            client.query(query, function (err, result) {
                if (err) throw err // menampilkan error dari query

                response.redirect('/')
            })


        })
    });

    app.get('/update-blog/:idParams', function (request, response) {
        if (!request.session.user) {
            request.flash('danger', 'Silahkan login!')
            return response.redirect('/login')
        }
        let id = request.params.idParams


        db.connect(function (err, client, done) {
            if (err) throw err // menampilkan error koneksi database

            let query = `SELECT * FROM tb_projects WHERE id=${id}`

            client.query(query, function (err, result) {
                if (err) throw err // menampilkan error dari query
                let data = result.rows
                // console.log(result.rowCount)

                let dataBlog = data.map(function (item) {
                    item.technologies = item.technologies.map(function (checked) {
                        if (checked != `undefined`) {
                            return checked
                        } else {
                            checked = undefined
                        }
                    })
                    return {
                        ...item,
                        start_date: getStart(item.start_date),
                        end_date: getStart(item.end_date),


                    }
                })

                console.log(dataBlog)
                response.render('update-blog', { data: dataBlog[0] })
            })

        })
    });



    app.post('/update-blog/:idParams', upload.single('inputImage'), function (request, response) {
        let id = request.params.idParams
        // console.log(request.body);
        let title = request.body.inputTitle;
        let startDate = request.body.inputStartDate;
        let endDate = request.body.inputEndDate;
        let content = request.body.inputContent;
        let android = request.body.android;
        let react = request.body.react;
        let nodejs = request.body.nodejs;
        let squarejs = request.body.squarejs;


        // console.log(request.file.filename);
        const image = request.file.filename

        db.connect(function (err, client, done) {
            if (err) throw err // menampilkan error koneksi database

            let query = `UPDATE public.tb_projects
        SET  title='${title}', start_date='${startDate}', end_date='${endDate}', content='${content}',
        technologies = '{${android},${react},${nodejs},${squarejs}}', image = '${image}'
        WHERE id ='${id}';`
            client.query(query, function (err, result) {
                if (err) throw err // menampilkan error dari query

                response.redirect('/')
            })


        })
    });

    app.get('/delete-blog/:idParams', function (request, response) {
        let id = request.params.idParams

        db.connect(function (err, client, done) {
            if (err) throw err // menampilkan error koneksi database

            let query = `DELETE FROM tb_projects WHERE id=${id}`

            client.query(query, function (err, result) {
                if (err) throw err // menampilkan error dari query
                response.redirect('/')
            })

        })
    });

    app.get('/register', function (request, response) {
        response.render('register')
    })

    app.post('/register', function (request, response) {

        console.log(request.body);
        let { inputName, inputEmail, inputPassword } = request.body

        const hashedPassword = bcrypt.hashSync(inputPassword, 10)

        let query = `INSERT INTO public.tb_user(name, email, password)
        VALUES('${inputName}', '${inputEmail}', '${hashedPassword}');`

        client.query(query, function (err, result) {
            if (err) throw err // menampilkan error dari query

            response.redirect('/register')
        })
    })

    app.get('/login', function (request, response) {
        response.render('login')
    })

    app.post('/login', function (request, response) {

        let { inputEmail, inputPassword } = request.body

        let query = `SELECT * FROM public.tb_user WHERE email='${inputEmail}';`

        client.query(query, function (err, result) {
            if (err) throw err // menampilkan error dari query

            // console.log(result.rows.length);
            console.log(result.rows[0]);
            if (result.rows.length == 0) {
                console.log('Email belum terdaftar')
                request.flash('danger', 'Email belum terdaftar')
                return response.redirect('/login')
            }

            const isMatch = bcrypt.compareSync(inputPassword, result.rows[0].password)
            console.log(isMatch);

            if (isMatch) {
                console.log('Login berhasil');

                request.session.isLogin = true
                request.session.user = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email,
                }
                request.flash('success', 'Login berhasil')
                response.redirect('/')

            } else {
                console.log('Password salah');
                request.flash('danger', 'Password salah')
                response.redirect('/login')
            }

        })
    })


    app.get('/logout', function (request, response) {
        request.session.destroy()

        response.redirect('/login')
    })
})


function getFullTime(time) {

    let month = ["Januari", "Febuari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember"]

    let date = new Date(time).getDate()
    let monthIndex = new Date(time).getMonth()
    let year = new Date(time).getFullYear()

    // let hours = time.getHours()
    // let minutes = time.getMinutes()

    // if (hours < 10) {
    //     hours = "0" + hours
    // } else if (minutes < 10) {
    //     minutes = "0" + minutes
    // }

    // 12 Agustus 2022 09.04
    let fullTime = `${date} ${month[monthIndex]} ${year}`
    // console.log(fullTime);
    return fullTime
}
function getStart(start) {
    let d = new Date(start),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) {
        month = '0' + month
    }

    if (day.length < 2) {
        day = '0' + day
    }

    return [year, month, day].join('-')

}
function getDistanceTime(time, end) {
    let timeNow = end;
    let timePost = time;

    let distance = timeNow - timePost;

    let milisecond = 1000;
    let secondInHours = 3600;
    let hoursInDay = 24;
    let daysInMonth = 30;

    let distanceMonth = Math.floor(distance / (milisecond * secondInHours * hoursInDay * daysInMonth));
    let distanceDay = Math.floor(distance / (milisecond * secondInHours * hoursInDay));
    let distanceHours = Math.floor(distance / (milisecond * 60 * 60));
    let distanceMinutes = Math.floor(distance / (milisecond * 60));
    let distanceSeconds = Math.floor(distance / milisecond);

    if (distanceMonth > 0) {
        return `${distanceMonth} bulan `;
    } else if (distanceDay > 0) {
        return `${distanceDay} hari `;
    } else if (distanceHours > 0) {
        return `${distanceHours} jam `;
    } else if (distanceMinutes > 0) {
        return `${distanceMinutes} menit`;
    } else {
        return `${distanceSeconds} detik`;
    }
}

app.listen(port, function () {
    console.log(`server running on port ${port}`);
})