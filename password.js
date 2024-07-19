function checkPassword() {
    const password = document.getElementById('password').value;

    // Replace with your actual password
    if (password === 'cotomakassar') {
        document.getElementById('passwordPrompt').classList.add('hide');
        document.getElementById('content').classList.add('show');
        setDate(); // Initialize invoice after password verification
    } else {
        alert('Incorrect password. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('passwordPrompt').classList.remove('hide');
    document.getElementById('content').classList.remove('show');
});
