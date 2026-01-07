import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ProgressBar from "./ProgressBar";
import ImageCropper from "./ImageCropper";
import { Country, State } from "country-state-city";
import Select from "react-select";
import { generateProfilePDF } from '../../utils/pdfGenerator';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    photo: null,
    photoPreview: null,
    dob: "",
    country: null,
    state: null,
    interests: [],
  });
  const [errors, setErrors] = useState({});

  // Image crop states
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState(null);

  const totalSteps = 3;
  const totalQuestions = 6;

  // Interests options for multi-select
  const interestOptions = [
    { value: "Technology", label: "Technology" },
    { value: "Sports", label: "Sports" },
    { value: "Music", label: "Music" },
    { value: "Travel", label: "Travel" },
    { value: "Reading", label: "Reading" },
    { value: "Cooking", label: "Cooking" },
    { value: "Photography", label: "Photography" },
    { value: "Gaming", label: "Gaming" },
    { value: "Art", label: "Art" },
    { value: "Fitness", label: "Fitness" },
  ];

  // Get all countries
  const countryOptions = Country.getAllCountries().map((country) => ({
    value: country.isoCode,
    label: country.name,
  }));

  // Get states based on selected country
  const getStateOptions = (country) => {
    if (!country) return [];
    return State.getStatesOfCountry(country.value).map((state) => ({
      value: state.isoCode,
      label: state.name,
    }));
  };

  // Calculate questions completed
  const getQuestionsCompleted = () => {
    if (currentStep === 1) return formData.name ? 1 : 0;
    if (currentStep === 2) {
      let count = 1;
      if (formData.photo) count++;
      if (formData.dob) count++;
      return count;
    }
    if (currentStep === 3) {
      let count = 3;
      if (formData.country) count++;
      if (formData.state) count++;
      if (formData.interests.length > 0) count++;
      return count;
    }
    return 0;
  };

  // Update form data
  const updateFormData = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  // Handle image selection
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, photo: "Image size should be less than 5MB" });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setTempImage(reader.result);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle crop complete
  const handleCropComplete = (croppedBlob) => {
    setFormData({
      ...formData,
      photo: croppedBlob,
      photoPreview: URL.createObjectURL(croppedBlob),
    });
    setShowCropper(false);
    setTempImage(null);
  };

  // Handle country change - reset state
  const handleCountryChange = (selectedCountry) => {
    console.log("Country selected:", selectedCountry);
    updateFormData("country", selectedCountry);
    updateFormData("state", null); // Reset state when country changes

    // Debug - check states for selected country
    const states = State.getStatesOfCountry(selectedCountry.value);
    console.log(
      "Available states for",
      selectedCountry.label,
      ":",
      states.length
    );
  };

  // Validate current step
  const validateStep = () => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.name || formData.name.trim().length < 2) {
        newErrors.name = "Name must be at least 2 characters";
      }
    }

    if (currentStep === 2) {
      if (!formData.photo) {
        newErrors.photo = "Please upload a photo";
      }
      if (!formData.dob) {
        newErrors.dob = "Please select your date of birth";
      }
      // Validate age (must be 13+)
      if (formData.dob) {
        const today = new Date();
        const birthDate = new Date(formData.dob);
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 0) {
          newErrors.dob = "You must be at least 13 years old";
        }
      }
    }

    if (currentStep === 3) {
      if (!formData.country) {
        newErrors.country = "Please select a country";
      }
      if (!formData.state) {
        newErrors.state = "Please select a state";
      }
      if (formData.interests.length === 0) {
        newErrors.interests = "Please select at least one interest";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation handlers
  const handleNext = () => {
    if (validateStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
  if (validateStep()) {
    try {
      // Prepare data for submission
      const submitData = {
        name: formData.name,
        dob: formData.dob,
        country: formData.country,
        state: formData.state,
        interests: formData.interests
      };

      console.log('Form Data:', submitData);

      // Generate PDF
      await generateProfilePDF(formData);

      // TODO: Upload photo to Cloudinary
      // TODO: Save data to backend API

      alert('Profile completed successfully! PDF has been downloaded.');
      navigate('/profile');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Profile saved but PDF generation failed. Please try again.');
    }
  }
};

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              What is your name?
            </h3>
            <div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData("name", e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            {/* Photo Upload */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Upload your photo
              </h3>

              {formData.photoPreview ? (
                <div className="flex flex-col items-center">
                  <img
                    src={formData.photoPreview}
                    alt="Preview"
                    className="w-40 h-40 rounded-full object-cover border-4 border-blue-500 mb-4"
                  />
                  <button
                    onClick={() =>
                      document.getElementById("photo-input").click()
                    }
                    className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Change Photo
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg
                        className="w-10 h-10 mb-3 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click to upload</span>{" "}
                        or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PNG, JPG or JPEG (MAX. 5MB)
                      </p>
                    </div>
                    <input
                      id="photo-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {errors.photo && (
                <p className="mt-2 text-sm text-red-600">{errors.photo}</p>
              )}
            </div>

            {/* Date of Birth */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Date of birth
              </h3>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => updateFormData("dob", e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.dob && (
                <p className="mt-2 text-sm text-red-600">{errors.dob}</p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Country */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                In which country do you live?
              </h3>
              <Select
                value={formData.country}
                onChange={handleCountryChange}
                options={countryOptions}
                placeholder="Search and select country..."
                className="basic-single"
                classNamePrefix="select"
                isSearchable
              />
              {errors.country && (
                <p className="mt-2 text-sm text-red-600">{errors.country}</p>
              )}
            </div>

            {/* State */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                In which state do you live?
              </h3>
              <Select
                value={formData.state}
                onChange={(selected) => updateFormData("state", selected)}
                options={getStateOptions(formData.country)}
                placeholder={
                  formData.country
                    ? "Search and select state..."
                    : "Select country first"
                }
                className="basic-single"
                classNamePrefix="select"
                isSearchable
                isDisabled={!formData.country}
              />
              {errors.state && (
                <p className="mt-2 text-sm text-red-600">{errors.state}</p>
              )}
            </div>

            {/* Interests */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Your interests?
              </h3>
              <Select
                value={formData.interests}
                onChange={(selected) =>
                  updateFormData("interests", selected || [])
                }
                options={interestOptions}
                placeholder="Search and select interests..."
                className="basic-multi-select"
                classNamePrefix="select"
                isMulti
                isSearchable
              />
              {errors.interests && (
                <p className="mt-2 text-sm text-red-600">{errors.interests}</p>
              )}
              {formData.interests.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {formData.interests.map((i) => i.label).join(", ")}
                </p>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg p-8">
          <ProgressBar
            currentStep={currentStep}
            totalSteps={totalSteps}
            questionsCompleted={getQuestionsCompleted()}
            totalQuestions={totalQuestions}
          />

          <div className="mb-8">{renderStepContent()}</div>

          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-6 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="px-6 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition"
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && tempImage && (
        <ImageCropper
          image={tempImage}
          onCropComplete={handleCropComplete}
          onCancel={() => {
            setShowCropper(false);
            setTempImage(null);
          }}
        />
      )}
    </div>
  );
};

export default CompleteProfile;
