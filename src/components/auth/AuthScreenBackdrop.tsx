/**
 * Fons per pantalles d’autenticació: imatge cobrint la pantalla,
 * desenfocada i fosca perquè no competeixi amb el formulari.
 */
export function AuthScreenBackdrop(): React.ReactElement {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-zinc-950"
    >
      <div
        className="absolute inset-[-2.5%] bg-cover bg-center"
        style={{
          backgroundImage:
            "url('/images/Gemini_Generated_Image_1djlho1djlho1djl.png')",
          filter: "blur(10px) brightness(0.7)",
          transform: "scale(1.05)",
        }}
      />
    </div>
  );
}
