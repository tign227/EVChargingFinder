import dynamic from "next/dynamic";

const DynamicComponent = dynamic(() => import("./components/HomePage"), {
  ssr: false,
});

function Home() {
  return (
    <div>
      <DynamicComponent />
    </div>
  );
}

export default Home;
