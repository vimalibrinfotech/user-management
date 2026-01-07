const ProgressBar = ({
  currentStep,
  totalSteps,
  questionsCompleted,
  totalQuestions,
}) => {
  const progressPercentage =
    totalQuestions > 0
      ? Math.min((questionsCompleted / totalQuestions) * 100, 100)
      : 0;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-gray-900">
          Complete Your Profile
        </h2>
        <span className="text-sm font-medium text-gray-600">
          {questionsCompleted}/{totalQuestions} Questions
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicator */}
      <div className="text-sm text-gray-500">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
};

export default ProgressBar;
