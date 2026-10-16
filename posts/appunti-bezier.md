Una curva di Bézier di grado \(n\) è definita da \(n+1\) punti di controllo \(P_0, \dots, P_n\) tramite i polinomi di Bernstein:

$$
B(t) = \sum_{i=0}^{n} \binom{n}{i} (1-t)^{n-i} t^i \, P_i, \quad t \in [0,1]
$$

Proprietà chiave da ricordare per l'esame:

- la curva passa sempre per \(P_0\) e \(P_n\), ma non necessariamente per i punti intermedi;
- è contenuta nell'inviluppo convesso dei punti di controllo;
- è invariante per trasformazioni affini applicate ai punti di controllo.
