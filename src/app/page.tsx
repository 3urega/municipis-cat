export default function Home(): React.ReactElement {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        Catalunya Map
      </h1>
      <p className="max-w-md text-zinc-600 dark:text-zinc-400">
        Diari geogràfic: el mapa i el seguiment de municipis visitats arribaran en
        properes iteracions.
      </p>
    </div>
  );
}
