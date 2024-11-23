

export async function imageValidation(image) {
    // Validate file extensions
    const allowedExtensions = ["jpg", "jpeg", "png"];
    const filename = image.name;
    const fileExtension = filename.split(".").pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
        throw { Success: '0', message: "Image file type allowed (jpg, jpeg, png)" };
    }
    return true;
}