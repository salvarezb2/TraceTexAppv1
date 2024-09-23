// Función para cargar proveedores en el select
function loadSuppliers() {
    const supplierSelect = document.getElementById('supplierSelect');
    supplierSelect.innerHTML = ''; // Limpiar opciones anteriores
    fetch('/getSuppliers')
        .then(response => response.json())
        .then(suppliers => {
            suppliers.forEach(supplier => {
                const option = document.createElement('option');
                option.value = supplier.id; 
                option.textContent = supplier.name;
                supplierSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error loading suppliers:', error));
}

document.getElementById('addProductButton').onclick = function() {
    document.getElementById('addProductModal').style.display = 'block';

    // Cargar proveedores
    loadSuppliers();

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
    const quantity = document.getElementById('quantity').value;
    const price = document.getElementById('price').value;
    const idSupplier = document.getElementById('supplierSelect').value;
    const supplierText = supplierSelect.options[supplierSelect.selectedIndex].text;

    fetch('/addProduct', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            productName,
            description,
            quantity,
            price,
            idSupplier
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
                <td>${data.product.quantity}</td>
                <td>${data.product.price}</td>
                <td>${supplierText}</td>
                <td><button class="edit">Editar</button> <button class="delete">Eliminar</button></td>
            </tr>`;
            tableBody.insertAdjacentHTML('beforeend', newRow);
            document.getElementById('addProductModal').style.display = 'none';
            document.getElementById('addProductForm').reset();
        }
    })
    .catch(error => console.error('Error:', error));
};
