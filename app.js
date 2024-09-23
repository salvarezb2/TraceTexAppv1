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
                req.session.idUser = results[0].id
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
    const { productName, description, quantity, price, idSupplier } = req.body;

    req.getConnection((err, connection) => {
        if (err) {
            return res.status(500).send('Error en la conexión a la base de datos');
        }

        const newProduct = {
            productName,
            description,
            quantity,
            price,
            idSupplier
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
app.post('/addOrder', (req, res) => {
    const { products, quantity, status } = req.body;
    const idUser = req.session.idUser;

    if (!idUser) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    // Validar que los arrays sean del mismo tamaño
    if (!Array.isArray(products) || !Array.isArray(quantity) || products.length !== quantity.length) {
        return res.status(400).json({ success: false, message: 'Los productos y cantidades deben ser arrays del mismo tamaño.' });
    }

    req.getConnection((err, connection) => {
        if (err) {
            return res.status(500).send('Error en la conexión a la base de datos');
        }

        // Iniciar transacción
        connection.beginTransaction((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: 'Error al iniciar la transacción' });
            }

            // Inserta la orden en order_list
            connection.query('INSERT INTO order_list (idUser, status, dateCreation) VALUES (?, ?, NOW())', [idUser, status], (error, result) => {
                if (error) {
                    return connection.rollback(() => {
                        res.status(500).json({ success: false, message: 'Error al agregar la orden', error: error.message });
                    });
                }

                const orderId = result.insertId;

                // Inserta los detalles de la orden en order_detail
                const orderDetails = products.map((product, index) => [orderId, product, quantity[index]]);

                connection.query('INSERT INTO order_detail (idOrder, idProduct, quantity) VALUES ?', [orderDetails], (error, results) => {
                    if (error) {
                        return connection.rollback(() => {
                            res.status(500).json({ success: false, message: 'Error al agregar los detalles de la orden', error: error.message });
                        });
                    }

                    // Obtener nombres de los productos
                    const productIds = products.join(', ');
                    connection.query(`SELECT idProduct, productName FROM product WHERE idProduct IN (${productIds})`, (error, productNames) => {
                        if (error) {
                            return connection.rollback(() => {
                                res.status(500).json({ success: false, message: 'Error al obtener los nombres de los productos', error: error.message });
                            });
                        }

                        // Confirmar la transacción
                        connection.commit((err) => {
                            if (err) {
                                return connection.rollback(() => {
                                    res.status(500).json({ success: false, message: 'Error al confirmar la orden', error: err.message });
                                });
                            }

                            // Respuesta exitosa
                            res.json({
                                success: true,
                                order: {
                                    idOrder: orderId,
                                    totalQuantity: quantity.reduce((a, b) => a + Number(b), 0),
                                    status,
                                    idUser,
                                    dateCreation: new Date() // Fecha de creación de la orden
                                },
                                products: productNames // Aquí se incluyen los nombres de los productos
                            });
                        });
                    });
                });
            });
        });
    });
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

