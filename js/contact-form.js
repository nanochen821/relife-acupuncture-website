const appointmentForm = document.querySelector(
    "[data-appointment-form]"
);

const formStatus = document.querySelector(
    "[data-form-status]"
);

if (appointmentForm && formStatus) {
    appointmentForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (!appointmentForm.checkValidity()) {
            appointmentForm.reportValidity();
            return;
        }

        formStatus.hidden = false;

        formStatus.textContent =
            "This prototype form is not connected yet. " +
            "Please call or text ReLife at (408) 888-3616 " +
            "to request an appointment.";

        formStatus.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    });
}