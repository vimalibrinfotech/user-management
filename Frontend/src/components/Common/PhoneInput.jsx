const PhoneInput = ({ phones, setPhones }) => {
  const addPhone = () => {
    setPhones([...phones, '']);
  };

  const removePhone = (index) => {
    const newPhones = phones.filter((_, i) => i !== index);
    setPhones(newPhones.length > 0 ? newPhones : ['']);
  };

  const updatePhone = (index, value) => {
    const newPhones = [...phones];
    newPhones[index] = value;
    setPhones(newPhones);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Phone Numbers
      </label>
      {phones.map((phone, index) => (
        <div key={index} className="flex gap-2">
          <input
            type="text"
            value={phone}
            onChange={(e) => updatePhone(index, e.target.value)}
            placeholder="10 digit phone number"
            maxLength="10"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {phones.length > 1 && (
            <button
              type="button"
              onClick={() => removePhone(index)}
              className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addPhone}
        className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
      >
        + Add Phone Number
      </button>
    </div>
  );
};

export default PhoneInput;