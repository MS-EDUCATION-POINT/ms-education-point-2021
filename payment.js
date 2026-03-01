// Payment Modal Logic
const paymentModal = document.getElementById('paymentModal');
const statusModal = document.getElementById('statusModal');

function openPaymentModal() {
    paymentModal.style.display = 'block';
}

function closePaymentModal() {
    paymentModal.style.display = 'none';
}

function openStatusModal() {
    statusModal.style.display = 'block';
    document.getElementById('statusResult').style.display = 'none';
}

function closeStatusModal() {
    statusModal.style.display = 'none';
}

// Close modals when clicking outside
window.onclick = function (event) {
    if (event.target === paymentModal) {
        closePaymentModal();
    }
    if (event.target === statusModal) {
        closeStatusModal();
    }
}

// Submit Payment
const paymentForm = document.getElementById('paymentForm');
if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!window.db) {
            alert("Firebase is not configured! Please see firebase-config.js.");
            return;
        }

        const btn = document.getElementById('submitPayBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        btn.disabled = true;

        const paymentData = {
            studentName: document.getElementById('payName').value,
            phone: document.getElementById('payPhone').value,
            email: document.getElementById('payEmail').value,
            course: document.getElementById('payClass').value,
            paymentType: document.getElementById('payType').value,
            paymentMonth: document.getElementById('payMonth').value,
            amount: parseFloat(document.getElementById('payAmount').value),
            transactionId: document.getElementById('payTxnId').value.trim(),
            status: "pending",
            duesAmount: 0, // Default to 0, admin can update this
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            // Check if Transaction ID already exists to prevent duplicates
            const snapshot = await window.db.collection('payments').where('transactionId', '==', paymentData.transactionId).get();
            if (!snapshot.empty) {
                alert("This Transaction ID has already been submitted!");
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }

            await window.db.collection('payments').add(paymentData);

            // Optional: Send Email to Admin via EmailJS
            // emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", {
            //     name: paymentData.studentName,
            //     course: paymentData.course,
            //     amount: paymentData.amount,
            //     transactionId: paymentData.transactionId
            // }, "YOUR_PUBLIC_KEY");

            btn.innerHTML = '<i class="fa-solid fa-check"></i> Submitted Successfully!';
            btn.classList.replace('btn-primary', 'btn-secondary');

            setTimeout(() => {
                closePaymentModal();
                paymentForm.reset();
                btn.innerHTML = originalText;
                btn.classList.replace('btn-secondary', 'btn-primary');
                btn.disabled = false;
            }, 2000);

        } catch (error) {
            console.error("Error adding payment: ", error);
            alert("Error submitting payment. Please try again.");
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// Check Status Logic
const statusForm = document.getElementById('statusForm');
let currentApprovedPayment = null;

if (statusForm) {
    statusForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!window.db) {
            alert("Firebase is not configured! Please see firebase-config.js.");
            return;
        }

        const txnId = document.getElementById('checkTxnId').value.trim();
        const btn = document.getElementById('checkStatusBtn');
        btn.innerHTML = 'Checking...';
        btn.disabled = true;

        try {
            const snapshot = await window.db.collection('payments').where('transactionId', '==', txnId).get();

            const resultDiv = document.getElementById('statusResult');
            const statusText = document.getElementById('statusText');
            const downloadBtn = document.getElementById('downloadReceiptBtn');
            currentApprovedPayment = null;

            if (snapshot.empty) {
                statusText.innerHTML = `<span style="color: red;">Payment not found. Please verify your Transaction ID.</span>`;
                downloadBtn.style.display = 'none';
            } else {
                const doc = snapshot.docs[0].data();

                if (doc.status === 'pending') {
                    statusText.innerHTML = `<span style="color: var(--accent-color);">Status: Pending Admin Approval</span>`;
                    downloadBtn.style.display = 'none';
                } else if (doc.status === 'approved') {
                    statusText.innerHTML = `<span style="color: #4ade80;">Status: Approved!</span>`;
                    downloadBtn.style.display = 'inline-block';
                    currentApprovedPayment = doc; // store for PDF generation
                } else if (doc.status === 'rejected') {
                    statusText.innerHTML = `<span style="color: red;">Status: Rejected. Please contact admin.</span>`;
                    downloadBtn.style.display = 'none';
                }
            }

            resultDiv.style.display = 'block';
            btn.innerHTML = 'Check Status';
            btn.disabled = false;

        } catch (error) {
            console.error("Error fetching status", error);
            btn.innerHTML = 'Check Status';
            btn.disabled = false;
        }
    });
}

// Generate PDF Receipt
document.getElementById('downloadReceiptBtn')?.addEventListener('click', () => {
    if (!currentApprovedPayment) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // MS Education Point Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(7, 33, 44); // primary color
    doc.text("MS Education Point", 105, 20, null, null, "center");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text("Taralahi Village, Darbhanga, Bihar - 846003", 105, 28, null, null, "center");
    doc.text("Phone: +91 8407856657 | Email: mseducationpoint2021@gmail.com", 105, 34, null, null, "center");

    // Divider Line
    doc.setDrawColor(101, 162, 56); // accent color
    doc.setLineWidth(1);
    doc.line(20, 42, 190, 42);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text("FEE PAYMENT RECEIPT", 105, 55, null, null, "center");

    // Details Box
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(20, 65, 170, 70);

    // Content
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    const date = currentApprovedPayment.timestamp ? currentApprovedPayment.timestamp.toDate().toLocaleDateString() : new Date().toLocaleDateString();

    doc.text(`Student Name: ${currentApprovedPayment.studentName}`, 25, 75);
    doc.text(`Class/Course: ${currentApprovedPayment.course}`, 25, 83);
    doc.text(`Fee Type: ${currentApprovedPayment.paymentType}`, 25, 91);

    // Only show Fee Month if it's applicable
    let yOffset = 91;
    if (currentApprovedPayment.paymentMonth && currentApprovedPayment.paymentMonth !== "Not Applicable") {
        yOffset += 8;
        doc.text(`Fee Month: ${currentApprovedPayment.paymentMonth}`, 25, yOffset);
    }

    yOffset += 8;
    doc.text(`Transaction ID: ${currentApprovedPayment.transactionId}`, 25, yOffset);
    yOffset += 8;
    doc.text(`Payment Date: ${date}`, 25, yOffset);
    yOffset += 8;
    doc.text(`Status: APPROVED`, 25, yOffset);

    // Amount & Dues Box
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(248, 249, 250);
    doc.rect(20, 138, 170, 25, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(7, 33, 44);
    doc.text(`Amount Paid: Rs. ${currentApprovedPayment.amount}`, 25, 146);

    // Display Dues
    const dues = currentApprovedPayment.duesAmount || 0;
    if (dues > 0) {
        doc.setTextColor(239, 68, 68); // Red color for dues
        doc.text(`Remaining Dues: Rs. ${dues}`, 25, 156);
    } else {
        doc.setTextColor(74, 222, 128); // Green for no dues
        doc.text(`Remaining Dues: Rs. 0 (Cleared)`, 25, 156);
    }

    // Footer
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150, 150, 150);
    doc.text("This is an automatically generated receipt and does not require a signature.", 105, 180, null, null, "center");

    // Save
    doc.save(`Receipt_${currentApprovedPayment.studentName}_${currentApprovedPayment.transactionId}.pdf`);
});
