function checkPassword() {
    const pw = document.getElementById('adminPassword').value;
    if (pw === "Prabhat#1") {
        document.getElementById('loginOverlay').style.display = 'none';
        loadPayments();
        loadInquiries();
        loadFees();
    } else {
        document.getElementById('loginError').style.display = 'block';
    }
}

// Ensure db is loaded
if (!window.db) {
    document.getElementById('paymentsBody').innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Firebase config is missing in firebase-config.js</td></tr>';
}

function loadPayments() {
    if (!window.db) return;

    // Real-time listener for the payments collection
    window.db.collection('payments').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
        const tbody = document.getElementById('paymentsBody');
        tbody.innerHTML = ''; // clear loading

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No payments found.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleString() : "Just now";

            let statusBadge = '';
            if (data.status === 'pending') statusBadge = '<span class="status-badge status-pending">Pending</span>';
            if (data.status === 'approved') statusBadge = '<span class="status-badge status-approved">Approved</span>';
            if (data.status === 'rejected') statusBadge = '<span class="status-badge status-rejected">Rejected</span>';

            let actionButtons = '';
            if (data.status === 'pending') {
                actionButtons = `
                    <button class="btn btn-approve" onclick="updatePaymentStatus('${doc.id}', 'approved')"><i class="fa-solid fa-check"></i> Approve</button>
                    <button class="btn btn-reject" onclick="updatePaymentStatus('${doc.id}', 'rejected')"><i class="fa-solid fa-xmark"></i> Reject</button>
                `;
            } else if (data.status === 'approved') {
                actionButtons = `
                    <div style="display:flex; flex-direction:column; gap:5px;">
                        <button class="btn btn-approve" style="background-color: #3b82f6; font-size: 0.8rem;" onclick="editDues('${doc.id}', ${data.duesAmount || 0})"><i class="fa-solid fa-pen"></i> Edit Dues</button>
                `;

                if (data.duesAmount > 0) {
                    // Generate WhatsApp Link
                    const waLink = `https://wa.me/91${data.phone}?text=Hello ${encodeURIComponent(data.studentName)}, this is a reminder from MS Education Point. Your remaining dues amount is Rs. ${data.duesAmount}. Please clear it at your earliest convenience.`;
                    // Generate Mailto Link
                    const mailLink = `mailto:${data.email}?subject=Fee Dues Reminder - MS Education Point&body=Hello ${encodeURIComponent(data.studentName)},%0D%0A%0D%0AThis is a reminder from MS Education Point. Your remaining dues amount is Rs. ${data.duesAmount}. Please clear it at your earliest convenience.%0D%0A%0D%0AThank You.`;

                    actionButtons += `
                            <a href="${waLink}" target="_blank" class="btn btn-approve" style="background-color:#25D366; text-decoration:none; text-align:center; font-size:0.8rem;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>
                            <a href="${mailLink}" class="btn btn-approve" style="background-color:#65a238; text-decoration:none; text-align:center; font-size:0.8rem;"><i class="fa-solid fa-envelope"></i> Email</a>
                    `;
                }

                actionButtons += `</div>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${data.studentName}</strong></td>
                <td>${data.phone || 'N/A'}<br><small>${data.email || 'N/A'}</small></td>
                <td>${data.course}</td>
                <td>₹ ${data.amount}<br><small style="color:#ef4444;">Dues: ₹${data.duesAmount || 0}</small></td>
                <td>${data.transactionId}</td>
                <td>${statusBadge}</td>
                <td>${actionButtons}</td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error listening to payments: ", error);
        document.getElementById('paymentsBody').innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Error loading payments. Check Firebase permissions.</td></tr>';
    });
}

function loadInquiries() {
    if (!window.db) return;

    // Real-time listener for the inquiries collection
    window.db.collection('inquiries').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
        const tbody = document.getElementById('inquiriesBody');
        tbody.innerHTML = ''; // clear loading

        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No inquiries found.</td></tr>';
            return;
        }

        snapshot.forEach((doc) => {
            const data = doc.data();
            const dateStr = data.timestamp ? data.timestamp.toDate().toLocaleString() : "Just now";

            let statusBadge = '';
            if (data.status === 'new') statusBadge = '<span class="status-badge status-pending" style="background-color: #fecaca; color: #991b1b;">New</span>';
            if (data.status === 'contacted') statusBadge = '<span class="status-badge status-approved" style="background-color: #bbf7d0; color: #166534;">Contacted</span>';

            let actionButtons = '';
            if (data.status === 'new' || !data.status) {
                actionButtons = `
                    <button class="btn btn-approve" onclick="updateInquiryStatus('${doc.id}', 'contacted')"><i class="fa-solid fa-phone"></i> Mark Contacted</button>
                `;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${data.studentName}</strong></td>
                <td>${data.phone}</td>
                <td>${data.course}</td>
                <td>${data.message || 'N/A'}</td>
                <td>${statusBadge}</td>
                <td>${actionButtons}</td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error listening to inquiries: ", error);
        document.getElementById('inquiriesBody').innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">Error loading inquiries.</td></tr>';
    });
}

// Update Status Function
window.updatePaymentStatus = async function (docId, newStatus) {
    if (!confirm(`Are you sure you want to mark this payment as ${newStatus}?`)) return;

    let dues = 0;
    if (newStatus === 'approved') {
        const duesInput = prompt("Enter the remaining dues amount for this student (Enter 0 if clear):", "0");
        if (duesInput === null) return; // Admin cancelled the approval prompt
        dues = parseFloat(duesInput) || 0;
    }

    try {
        await window.db.collection('payments').doc(docId).update({
            status: newStatus,
            duesAmount: dues
        });
        // The onSnapshot listener will automatically refresh the table
    } catch (error) {
        console.error("Error updating status: ", error);
        alert("Action failed. Please try again.");
    }
}

// Edit Dues Function
window.editDues = async function (docId, currentDues) {
    const duesInput = prompt("Enter the new remaining dues amount for this student:", currentDues);
    if (duesInput === null) return; // Admin cancelled

    const dues = parseFloat(duesInput) || 0;

    try {
        await window.db.collection('payments').doc(docId).update({
            duesAmount: dues
        });
    } catch (error) {
        console.error("Error updating dues: ", error);
        alert("Action failed. Please try again.");
    }
}

// Update Inquiry Status Function
window.updateInquiryStatus = async function (docId, newStatus) {
    if (!confirm(`Are you sure you want to mark this inquiry as ${newStatus}?`)) return;

    try {
        await window.db.collection('inquiries').doc(docId).update({
            status: newStatus
        });
    } catch (error) {
        console.error("Error updating inquiry status: ", error);
        alert("Action failed. Please try again.");
    }
}

// --- Fee Management ---
window.editFee = async function (docId, currentAdmission, currentMonthly) {
    const admissionInput = prompt("Enter new Admission Fee (숫자만, e.g., 100):", currentAdmission);
    if (admissionInput === null) return;

    const monthlyInput = prompt("Enter new Monthly Fee (숫자만, e.g., 600):", currentMonthly);
    if (monthlyInput === null) return;

    const newAdmission = parseInt(admissionInput) || 0;
    const newMonthly = parseInt(monthlyInput) || 0;

    try {
        await window.db.collection('fees').doc(docId).update({
            admissionFee: newAdmission,
            monthlyFee: newMonthly
        });
    } catch (error) {
        console.error("Error updating fee:", error);
        alert("Action failed. Please try again.");
    }
}

async function seedDefaultFees() {
    const defaultFees = [
        { id: 'class1to5', name: 'Class 1 to 5 (CBSE / Bihar Board)', admissionFee: 100, monthlyFee: 400, deadline: '5th', order: 1 },
        { id: 'class5to8', name: 'Class 5 to 8 (CBSE / Bihar Board)', admissionFee: 100, monthlyFee: 500, deadline: '5th', order: 2 },
        { id: 'class9and10', name: 'Class 9 & 10 (Board Specials)', admissionFee: 100, monthlyFee: 600, deadline: '7th', order: 3 },
        { id: 'jnv', name: 'JNV Entrance Prep', admissionFee: 100, monthlyFee: 600, deadline: '5th', order: 4 },
        { id: 'sainik', name: 'Sainik School Prep', admissionFee: 100, monthlyFee: 600, deadline: '5th', order: 5 }
    ];

    for (let fee of defaultFees) {
        await window.db.collection('fees').doc(fee.id).set({
            name: fee.name,
            admissionFee: fee.admissionFee,
            monthlyFee: fee.monthlyFee,
            deadline: fee.deadline,
            order: fee.order
        });
    }
}

function loadFees() {
    if (!window.db) return;

    window.db.collection('fees').orderBy('order', 'asc').onSnapshot(async (snapshot) => {
        const tbody = document.getElementById('feesBody');

        if (snapshot.empty) {
            // Seed default fees if empty
            await seedDefaultFees();
            return;
        }

        tbody.innerHTML = '';
        snapshot.forEach((doc) => {
            const data = doc.data();

            tbody.innerHTML += `
                <tr>
                    <td><strong>${data.name}</strong></td>
                    <td>₹ ${data.admissionFee}</td>
                    <td>₹ ${data.monthlyFee} / month</td>
                    <td>${data.deadline} of every month</td>
                    <td>
                        <button class="btn btn-approve" style="background-color: #3b82f6; font-size: 0.8rem; padding: 6px 12px; min-width: 80px;" onclick="editFee('${doc.id}', ${data.admissionFee}, ${data.monthlyFee})"><i class="fa-solid fa-pen"></i> Edit</button>
                    </td>
                </tr>
            `;
        });
    }, (error) => {
        console.error("Error listening to fees: ", error);
        document.getElementById('feesBody').innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Error loading fees. Review permissions.</td></tr>';
    });
}
