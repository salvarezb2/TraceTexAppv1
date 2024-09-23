//1. invocar express
const express = require('express');
const app = express();
const axios = require('axios');

//2. urlencoded para capturar datos del formulario
app.use(express.urlencoded({extended:false}));
app.use(express.json());

//3. invocar dotenv
const dotenv = require('dotenv');
dotenv.config({path: './env/.env'});

//4. directorio public
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));

//5. motor de plantilla
app.set('view engine', 'ejs');

//6. modulo para hashing de password bcryptjs
const bcryptjs = require('bcryptjs');

//7. variables de sesion
const session = require('express-session');
const mysql = require('mysql'); // Importar el módulo mysql
const myConnection = require('express-myconnection'); // Importar express-myconnection
app.use(session({
    secret: 'clave secreta',
    resave: true,
    saveUninitialized: true
}));

//8. llamar al modulo de conexion bd
app.use(myConnection(mysql, {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
}, 'single'));

//9. llamar al modulo de rutas
    app.get('/login', (req, res)=>{
        res.render('login');
    });
    app.get('/register', (req, res)=>{
        res.render('register');
    });

//10. registro
app.post('/register', async (req, res) => {
    const user = req.body.user;
    const pass = req.body.pass;
    const name = req.body.name;
    const lastname = req.body.lastname;
    let passHash = await bcryptjs.hash(pass, 8);
    
    req.getConnection((err, connection) => {
        if (err) {
            console.error('Error en la conexión:', err);
            return res.status(500).send('Error en la conexión a la base de datos');
        }

        connection.query('INSERT INTO users SET ?', { user: user, password: passHash, name: name, lastname: lastname }, (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).send('Error en el registro');
            } else {
                res.render('register',{
                    alert: true,
                    alertTitle: "Registro",
                    alertMessage: "¡Registro éxitoso!",
                    alertIcon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    ruta:'' 
                });
            }
        });
    });
});

//11. auntenticación
app.post('/auth', async (req, res) => {
    const user = req.body.user;
    const pass = req.body.pass;

    if (!user || !pass) {
        return res.status(400).send('Usuario y contraseña son requeridos.');
    }

    req.getConnection((err, connection) => {
        if (err) {
            console.error('Error en la conexión:', err);
            return res.status(500).send('Error en la conexión a la base de datos');
        }

        connection.query('SELECT * FROM users WHERE user = ?', [user], async (error, results) => {
            if (error) {
                console.error('Error en la consulta:', error);
                return res.status(500).send('Error en la autenticación');
            }
        
            if (results.length === 0 || !(await bcryptjs.compare(pass, results[0].password))) {
                res.render('login',{
                    alert: true,
                    alertTitle: "Error",
                    alertMessage: "Usuario y/o contraseña incorrecta",
                    alertIcon: 'error',
                    showConfirmButton: true,
                    timer: false,
                    ruta:'login' 
                });
            } else {
                req.session.loggedin = true;
                req.session.name = results[0].name;

                // Aquí se hace la solicitud de geolocalización
                const address = 'Ciudad de Guatemala'; // Cambia la dirección si es necesario
                const apiKey = process.env.GOOGLE_MAPS_API_KEY;

                try {
                    const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
                        params: {
                            address: address,
                            key: apiKey,
                        },
                    });

                    if (response.data.status === 'OK') {
                        // Obtener el nombre de la ciudad
                        const components = response.data.results[0].address_components;
                        const cityComponent = components.find(component => component.types.includes('locality'));
                        req.session.city = cityComponent ? cityComponent.long_name : 'Ciudad no encontrada'; // Guardar la ciudad en la sesión
                    } else {
                        console.error('Error en la geocodificación:', response.data.status);
                    }
                } catch (error) {
                    console.error('Error al hacer la solicitud:', error);
                }

                res.render('login', {
                    alert: true,
                    alertTitle: "Conexión éxitosa",
                    alertMessage: "¡Login éxitoso!",
                    alertIcon: 'success',
                    showConfirmButton: false,
                    timer: 1500,
                    ruta: ''
                });
            }
        });        
    });
});

//12. autenticacion en rutas
app.get('/', (req, res) => {
    if (req.session.loggedin) {
        res.render('index', {
            login: true,
            name: req.session.name,
            city: req.session.city
        });
    } else {
        res.render('index', {
            login: false,
            name: 'Porfavor inicie sesión.'
        });
    }
});

//13. cerrar sesion
app.get('/logout', (req, res)=>{
    req.session.destroy(()=>{
        res.redirect('/')
    })
})


//14. rutas burbuja
app.get('/addOrder', (req, res) => {
    res.render('addOrder', {
        login: req.session.loggedin || false,
        name: req.session.name || ''
    });
});

app.get('/searchOrder', (req, res) => {
    res.render('searchOrder', {
        login: req.session.loggedin || false,
        name: req.session.name || ''
    });
});

app.get('/addProduct', (req, res) => {
    res.render('addProduct', {
        login: req.session.loggedin || false,
        name: req.session.name || ''
    });
});


//15. agregar productos
app.post('/addProduct', (req, res) => {
    const { productName, description, quantities, price } = req.body;

    req.getConnection((err, connection) => {
        if (err) {
            return res.status(500).send('Error en la conexión a la base de datos');
        }

        const newProduct = {
            productName,
            description,
            quantities,
            price
        };

        connection.query('INSERT INTO product SET ?', newProduct, (error, results) => {
            if (error) {
                return res.status(500).send('Error al agregar el producto');
            }

            res.json({ success: true, product: { idProduct: results.insertId, ...newProduct } });
        });
    });
});

//16. agregar ordenes
app.post('/addOrder', async (req, res) => {
    const { products, quantities, supplierId } = req.body;

    try {
        const order = await db.query('INSERT INTO orderlist (supplierId, orderDate) VALUES (?, NOW())', [supplierId]);
        const orderId = order.insertId;

        for (let index = 0; index < products.length; index++) {
            await db.query('INSERT INTO orderdetail (orderId, productId, quantity) VALUES (?, ?, ?)', [orderId, products[index], quantities[index]]);
        }

        res.json({ success: true, order: { idOrder: orderId, products, totalQuantity: quantities.reduce((a, b) => a + Number(b), 0), supplierName: supplierId, orderDate: new Date() } });
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: 'Error al agregar la orden' });
    }
});


//17. Ruta para obtener proveedores desde la tabla de usuarios
app.get('/getSuppliers', (req, res) => {
    const query = 'SELECT id AS id, name AS name FROM users WHERE rol = 5';

    req.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener proveedores' });
        }

        connection.query(query, (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Error al obtener proveedores' });
            }
            res.json(results);
        });
    });
});

//18. Ruta para obtener productos
app.get('/getProducts', (req, res) => {
    const query = 'SELECT idProduct AS id, productName AS name FROM product';

    req.getConnection((err, connection) => {
        if (err) {
            return res.status(500).json({ error: 'Error al obtener productos' });
        }

        connection.query(query, (error, results) => {
            if (error) {
                return res.status(500).json({ error: 'Error al obtener productos' });
            }
            res.json(results);
        });
    });
});





app.listen(4000, (req, res)=>{
    console.log('Server is running on port http://localhost:4000');
})

