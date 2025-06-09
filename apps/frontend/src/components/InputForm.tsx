interface Props {
  title: string;
}

export default function InputForm({title}: Props) {
  return (
    <div className="mb-4">
      <input
        type="text"
        placeholder={title}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
