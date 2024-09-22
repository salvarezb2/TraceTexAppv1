document.getElementById('addProductButton').onclick = function() {
    document.getElementById('addProductModal').style.display = 'block';
};


document.querySelector('.close').onclick = function() {
    document.getElementById('addProductModal').style.display = 'none';
};

// Opción para cancelar
document.getElementById('cancel-btn').onclick = function() {
    document.getElementById('addProductModal').style.display = 'none';
};

// Envío del formulario
document.getElementById('addProductForm').onsubmit = function(event) {
    event.preventDefault();
    
    const productName = document.getElementById('productName').value;
    const description = document.getElementById('description').value;
    const quantities = document.getElementById('quantities').value;
    const price = document.getElementById('price').value;

    fetch('/addProduct', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            productName,
            description,
            quantities,
            price
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Agregar el nuevo producto a la tabla
            const tableBody = document.querySelector('#productsTable tbody');
            const newRow = `<tr>
                <td>${data.product.idProduct}</td>
                <td>${data.product.productName}</td>
                <td>${data.product.description}</td>
                <td>${data.product.quantities}</td>
                <td>${data.product.price}</td>
                <td><button class="edit">Editar</button> <button class="delete">Eliminar</button></td>
            </tr>`;
            tableBody.insertAdjacentHTML('beforeend', newRow);
            document.getElementById('addProductModal').style.display = 'none';
            document.getElementById('addProductForm').reset();
        }
    })
    .catch(error => console.error('Error:', error));
};
