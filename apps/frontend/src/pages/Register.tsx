import RegisterForm from "../components/RegisterForm";
import LoginForm from "../components/LoginForm";
import CreateProductForm from "../components/ProductForm2";
import ProductList from "../components/ProductList2";

export default function RegisterPage() {
  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
      <LoginForm></LoginForm>
      <RegisterForm></RegisterForm>
      <h1>Form create</h1>

    <CreateProductForm></CreateProductForm>
    <ProductList></ProductList>
    </div>
  );
}
