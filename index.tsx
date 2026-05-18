import React from "react";

export default function App() {
  return (
    <main style={{fontFamily:"sans-serif", background:"#f4f4f5", minHeight:"100vh"}}>
      <section style={{
        background:"#0f172a",
        color:"white",
        padding:"80px 24px"
      }}>
        <div style={{maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:40}}>
          <div>
            <span style={{
              background:"rgba(201,154,46,0.15)",
              color:"#fcd34d",
              padding:"10px 16px",
              borderRadius:999
            }}>
              Sorteo activo · Compra segura
            </span>

            <h1 style={{
              fontSize:64,
              fontWeight:900,
              lineHeight:1.1,
              marginTop:20
            }}>
              Gana una <span style={{color:"#fcd34d"}}>Toyota Fortuner</span>
            </h1>

            <p style={{
              marginTop:20,
              fontSize:20,
              color:"rgba(255,255,255,0.75)"
            }}>
              Participa desde $20.000 y juega con las últimas cifras de la lotería.
            </p>

            <div style={{
              marginTop:30,
              background:"rgba(255,255,255,0.08)",
              padding:24,
              borderRadius:24
            }}>
              <div style={{
                display:"flex",
                justifyContent:"space-between",
                marginBottom:12
              }}>
                <b>Boletas vendidas</b>
                <b>78%</b>
              </div>

              <div style={{
                height:10,
                background:"#27272a",
                borderRadius:999,
                overflow:"hidden"
              }}>
                <div style={{
                  width:"78%",
                  background:"#d4a017",
                  height:"100%"
                }} />
              </div>

              <button style={{
                marginTop:20,
                width:"100%",
                height:56,
                border:"none",
                borderRadius:18,
                background:"#d4a017",
                color:"white",
                fontWeight:900,
                fontSize:18,
                cursor:"pointer"
              }}>
                🎟️ ESCOGER MIS NÚMEROS
              </button>
            </div>
          </div>

          <div>
            <img
              src="https://images.unsplash.com/photo-1632245889029-e406faaa34cd?q=80&w=1200&auto=format&fit=crop"
              style={{
                width:"100%",
                borderRadius:32,
                objectFit:"cover",
                height:450
              }}
            />
          </div>
        </div>
      </section>

      <section style={{
        maxWidth:1200,
        margin:"0 auto",
        padding:"60px 24px"
      }}>
        <h2 style={{
          fontSize:40,
          fontWeight:900,
          marginBottom:10
        }}>
          Sorteos disponibles
        </h2>

        <p style={{color:"#71717a", marginBottom:30}}>
          Selecciona el sorteo en el que deseas participar.
        </p>

        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(3,1fr)",
          gap:24
        }}>
          {[1,2,3].map((item) => (
            <div key={item} style={{
              background:"white",
              borderRadius:32,
              overflow:"hidden",
              boxShadow:"0 10px 25px rgba(0,0,0,0.06)"
            }}>
              <img
                src="https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?q=80&w=1200&auto=format&fit=crop"
                style={{
                  width:"100%",
                  height:220,
                  objectFit:"cover"
                }}
              />

              <div style={{padding:24}}>
                <h3 style={{
                  fontSize:24,
                  fontWeight:900
                }}>
                  Mazda CX-30 + premios
                </h3>

                <p style={{marginTop:10, color:"#71717a"}}>
                  Sorteo: 30 de Mayo de 2026
                </p>

                <div style={{
                  marginTop:20,
                  display:"flex",
                  justifyContent:"space-between",
                  alignItems:"center",
                  background:"#fafafa",
                  padding:16,
                  borderRadius:20
                }}>
                  <div>
                    <small style={{color:"#71717a"}}>Desde</small>
                    <div style={{
                      fontWeight:900,
                      fontSize:28
                    }}>
                      $15.000
                    </div>
                  </div>

                  <button style={{
                    border:"none",
                    borderRadius:14,
                    background:"#d4a017",
                    color:"white",
                    padding:"14px 22px",
                    fontWeight:900,
                    cursor:"pointer"
                  }}>
                    Comprar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
